(function (root) {
  "use strict";

  function StageMediaController(options) {
    this.registry = options.registry || null;
    this.image = options.image;
    this.audio = options.audio;
    this.soundButton = options.soundButton;
    this.statusElement = options.statusElement;
    this.onStatus = options.onStatus || function () {};
    this.createAudioContext = options.createAudioContext || null;
    this.decodeBase64 = options.decodeBase64 || null;
    this.current = null;
    this.currentKey = null;
    this.resolvedAudio = null;
    this.soundEnabled = false;
    this.assetAvailable = false;
    this.atmosphereState = "stopped";
    this.playbackGeneration = 0;
    this.webAudioContext = null;
    this.webAudioSource = null;
    this.motionQuery = options.matchMedia ? options.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.reducedMotion = Boolean(this.motionQuery && this.motionQuery.matches);
    this.soundButton.addEventListener("click", this.toggleSound.bind(this));
    if (this.motionQuery) {
      if (typeof this.motionQuery.addEventListener === "function") {
        this.motionQuery.addEventListener("change", this.motionChanged.bind(this));
      } else if (typeof this.motionQuery.addListener === "function") {
        this.motionQuery.addListener(this.motionChanged.bind(this));
      }
    }
    this.updateControls();
  }

  StageMediaController.prototype.apply = function (presentation) {
    var resolved = this.resolve(presentation);
    var key;
    var self = this;
    if (!resolved) {
      this.clear(false);
      return;
    }
    key = [
      presentation.manifest_revision,
      presentation.scene_image_id,
      presentation.atmosphere_audio_id || ""
    ].join("|");
    if (this.currentKey === key) {
      if (this.soundEnabled && this.atmosphereState === "stopped") this.startAudio();
      this.report();
      return;
    }
    this.clear(false);
    this.current = presentation;
    this.currentKey = key;
    this.resolvedAudio = resolved.audio;
    this.assetAvailable = false;
    this.image.onload = function () {
      if (self.currentKey !== key) return;
      self.assetAvailable = true;
      self.image.hidden = false;
      self.report();
    };
    this.image.onerror = function () {
      if (self.currentKey !== key) return;
      self.assetAvailable = false;
      self.image.hidden = true;
      self.report();
    };
    this.image.hidden = true;
    this.image.src = resolved.image.source;
    if (resolved.audio && !this.usesWebAudio()) {
      this.audio.onerror = function () {
        if (self.currentKey !== key) return;
        self.atmosphereState = "failed";
        self.stopAudio(false);
        self.report();
      };
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.src = resolved.audio.source;
      try { this.audio.load(); } catch (error) { this.atmosphereState = "failed"; }
    }
    this.updateControls();
    if (this.soundEnabled && resolved.audio) this.startAudio();
  };

  StageMediaController.prototype.resolve = function (presentation) {
    var image;
    var audio = null;
    if (
      !presentation ||
      !this.registry ||
      this.registry.manifest_revision !== presentation.manifest_revision ||
      !this.registry.assets
    ) return null;
    image = this.registry.assets[presentation.scene_image_id];
    if (!image || image.kind !== "image" || !/^data:image\/png;base64,/.test(image.source)) return null;
    if (presentation.atmosphere_audio_id) {
      audio = this.registry.assets[presentation.atmosphere_audio_id];
      if (!audio || audio.kind !== "audio" || !/^data:audio\/mpeg;base64,/.test(audio.source)) return null;
    }
    return { image: image, audio: audio };
  };

  StageMediaController.prototype.toggleSound = function () {
    if (!this.current || !this.current.atmosphere_audio_id) return;
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) this.startAudio();
    else this.stopAudio(true);
    this.updateControls();
    this.report();
  };

  StageMediaController.prototype.startAudio = function () {
    var generation;
    var result;
    var self = this;
    if (!this.current || !this.current.atmosphere_audio_id || !this.soundEnabled) return;
    if (this.usesWebAudio()) {
      this.startWebAudio();
      return;
    }
    this.audio.loop = true;
    this.playbackGeneration += 1;
    generation = this.playbackGeneration;
    this.atmosphereState = "starting";
    this.updateControls();
    this.report();
    try {
      result = this.audio.play();
      if (result && typeof result.then === "function") {
        result.then(function () {
          if (generation !== self.playbackGeneration || !self.current || !self.soundEnabled) return;
          self.atmosphereState = "playing";
          self.updateControls();
          self.report();
        }).catch(function () {
          if (generation !== self.playbackGeneration) return;
          self.atmosphereState = "failed";
          self.updateControls();
          self.report();
        });
      } else {
        this.atmosphereState = "playing";
        this.updateControls();
        this.report();
      }
    } catch (error) {
      this.atmosphereState = "failed";
      this.updateControls();
      this.report();
    }
  };

  StageMediaController.prototype.usesWebAudio = function () {
    return Boolean(
      this.resolvedAudio &&
      /^data:audio\/mpeg;base64,/.test(this.resolvedAudio.source) &&
      this.createAudioContext &&
      this.decodeBase64
    );
  };

  StageMediaController.prototype.startWebAudio = function () {
    var context;
    var encoded;
    var bytes;
    var generation;
    var self = this;
    if (!this.usesWebAudio() || !this.soundEnabled || this.webAudioContext) return;
    this.playbackGeneration += 1;
    generation = this.playbackGeneration;
    this.atmosphereState = "starting";
    this.updateControls();
    this.report();
    try {
      context = this.createAudioContext();
      this.webAudioContext = context;
      encoded = this.resolvedAudio.source.slice(this.resolvedAudio.source.indexOf(",") + 1);
      bytes = this.decodeBase64(encoded);
      context.decodeAudioData(bytes.buffer, function (buffer) {
        var source;
        if (generation !== self.playbackGeneration || !self.current || !self.soundEnabled) {
          self.closeWebAudioContext(context);
          return;
        }
        try {
          source = context.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(context.destination);
          source.start(0);
          self.webAudioSource = source;
          self.atmosphereState = "playing";
          self.updateControls();
          self.report();
        } catch (error) {
          self.failWebAudio(generation, context);
        }
      }, function () {
        self.failWebAudio(generation, context);
      });
    } catch (error) {
      this.failWebAudio(generation, context);
    }
  };

  StageMediaController.prototype.failWebAudio = function (generation, context) {
    this.closeWebAudioContext(context);
    if (generation !== this.playbackGeneration) return;
    this.atmosphereState = "failed";
    this.updateControls();
    this.report();
  };

  StageMediaController.prototype.closeWebAudioContext = function (context) {
    if (!context) return;
    try { context.close(); } catch (error) {}
    if (this.webAudioContext === context) this.webAudioContext = null;
  };

  StageMediaController.prototype.stopAudio = function (resetPosition) {
    var context = this.webAudioContext;
    var source = this.webAudioSource;
    this.playbackGeneration += 1;
    this.webAudioSource = null;
    this.webAudioContext = null;
    if (source) {
      try { source.loop = false; } catch (error) {}
      try { source.stop(0); } catch (error) {}
      try { source.disconnect(); } catch (error) {}
    }
    if (context && typeof context.suspend === "function") {
      try { context.suspend(); } catch (error) {}
    }
    this.closeWebAudioContext(context);
    try { this.audio.loop = false; } catch (error) {}
    try { this.audio.pause(); } catch (error) {}
    if (resetPosition) {
      try { this.audio.currentTime = 0; } catch (error) {}
    }
    if (this.atmosphereState !== "failed") this.atmosphereState = "stopped";
    this.updateControls();
  };

  StageMediaController.prototype.suspend = function () {
    if (!this.current) return;
    this.stopAudio(true);
    this.report();
  };

  StageMediaController.prototype.resume = function () {
    if (this.current && this.soundEnabled) this.startAudio();
  };

  StageMediaController.prototype.clear = function (resetSound) {
    this.stopAudio(true);
    this.current = null;
    this.currentKey = null;
    this.resolvedAudio = null;
    this.assetAvailable = false;
    this.atmosphereState = "stopped";
    this.image.onload = null;
    this.image.onerror = null;
    this.image.hidden = true;
    this.image.removeAttribute("src");
    this.audio.onerror = null;
    this.audio.removeAttribute("src");
    try { this.audio.load(); } catch (error) {}
    if (resetSound) this.soundEnabled = false;
    this.updateControls();
  };

  StageMediaController.prototype.terminate = function () {
    this.clear(true);
  };

  StageMediaController.prototype.motionChanged = function (event) {
    this.reducedMotion = Boolean(event.matches);
    this.report();
  };

  StageMediaController.prototype.updateControls = function () {
    var hasAudio = Boolean(this.current && this.current.atmosphere_audio_id);
    this.soundButton.hidden = !hasAudio;
    this.soundButton.setAttribute("aria-pressed", this.soundEnabled ? "true" : "false");
    this.soundButton.textContent = this.soundEnabled ? "Mute atmosphere" : "Enable atmosphere";
    if (!this.current) this.statusElement.textContent = "Text presentation";
    else if (!this.assetAvailable) this.statusElement.textContent = "Artwork unavailable · text remains complete";
    else if (!hasAudio) this.statusElement.textContent = "Artwork ready · no atmosphere cue";
    else this.statusElement.textContent = "Artwork ready · atmosphere " + (this.soundEnabled ? this.atmosphereState : "muted");
  };

  StageMediaController.prototype.report = function () {
    this.updateControls();
    if (!this.current) return;
    this.onStatus({
      manifest_revision: this.current.manifest_revision,
      asset_available: this.assetAvailable,
      sound_enabled: this.soundEnabled,
      atmosphere_state: this.soundEnabled ? this.atmosphereState : "stopped",
      reduced_motion: this.reducedMotion
    });
  };

  root.GuiltyPartyStageMedia = { StageMediaController: StageMediaController };
}(typeof globalThis !== "undefined" ? globalThis : this));
