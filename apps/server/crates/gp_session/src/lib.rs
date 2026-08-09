use std::{
    fs::{File, OpenOptions},
    io::{self, BufRead, BufReader, Write},
    path::Path,
};

use gp_scenario::journal::JournalEntry;

#[derive(Debug)]
pub enum JournalFileError {
    Io(io::Error),
    Serialize(serde_json::Error),
    InvalidJson {
        line_number: usize,
        source: serde_json::Error,
    },
}

impl std::fmt::Display for JournalFileError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "journal I/O failed: {error}"),
            Self::Serialize(error) => write!(formatter, "journal serialization failed: {error}"),
            Self::InvalidJson {
                line_number,
                source,
            } => write!(
                formatter,
                "journal line {line_number} is not valid JSON: {source}"
            ),
        }
    }
}

impl std::error::Error for JournalFileError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            Self::Serialize(error) => Some(error),
            Self::InvalidJson { source, .. } => Some(source),
        }
    }
}

impl From<io::Error> for JournalFileError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

/// Appends one complete JSON object and flushes it before returning.
pub fn append_entry(path: &Path, entry: &JournalEntry) -> Result<(), JournalFileError> {
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    serde_json::to_writer(&mut file, entry).map_err(JournalFileError::Serialize)?;
    file.write_all(b"\n")?;
    file.flush()?;
    Ok(())
}

pub fn load_entries(path: &Path) -> Result<Vec<JournalEntry>, JournalFileError> {
    let file = File::open(path)?;
    BufReader::new(file)
        .lines()
        .enumerate()
        .filter_map(|(index, line)| match line {
            Ok(line) if line.trim().is_empty() => None,
            other => Some((index, other)),
        })
        .map(|(index, line)| {
            let line = line?;
            serde_json::from_str(&line).map_err(|source| JournalFileError::InvalidJson {
                line_number: index + 1,
                source,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use gp_scenario::{
        journal::{replay, JournalEntry, JournalEvent},
        schema::{Scenario, SUPPORTED_SCHEMA_VERSION},
    };

    use super::*;

    #[test]
    fn jsonl_round_trip_preserves_order_and_content() {
        let scenario = Scenario {
            schema_version: SUPPORTED_SCHEMA_VERSION,
            id: "journal-test".into(),
            version: 1,
            title: "Journal Test".into(),
            description: "Synthetic".into(),
            characters: vec![],
            scenes: vec![],
            clues: vec![],
            outcomes: vec![],
        };
        let entries = vec![
            JournalEntry::new(
                &scenario,
                1,
                10,
                JournalEvent::ParticipantJoined {
                    participant_id: "p1".into(),
                    name: "Synthetic Player".into(),
                },
            ),
            JournalEntry::new(&scenario, 2, 20, JournalEvent::VotingOpened),
        ];
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "guilty-party-journal-test-{}-{nonce}.jsonl",
            std::process::id()
        ));

        for entry in &entries {
            append_entry(&path, entry).unwrap();
        }
        let loaded = load_entries(&path).unwrap();
        std::fs::remove_file(path).unwrap();

        assert_eq!(loaded, entries);
        let state = replay(scenario, &loaded).unwrap();
        assert!(state.participants.contains_key("p1"));
        assert!(state.voting_open);
    }
}
