# Guilty Party iOS Companion MVP Setup

This document provides exact, detailed instructions for creating the native iOS Companion app via Xcode.

Per `ADR 0004`, we are building a native iOS app using Swift and SwiftUI, utilizing the `Network` framework for Bonjour/mDNS discovery and WebSockets.

## 1. Create the Xcode Project

1. Open **Xcode**.
2. Select **File > New > Project...**
3. In the template selector, choose **iOS** at the top, then select **App**, and click **Next**.
4. Configure the project options:
    - **Product Name:** `GuiltyPartyCompanion`
    - **Team:** (Select your personal team or leave it as None for now)
    - **Organization Identifier:** `com.guiltyparty`
    - **Bundle Identifier:** `com.guiltyparty.GuiltyPartyCompanion` (will auto-populate)
    - **Interface:** SwiftUI
    - **Language:** Swift
    - **Storage:** None
5. Click **Next**.
6. When asked where to save the project, navigate to `/Users/jasoncavinder/Projects/GuiltyParty/clients/companion` (create the `companion` folder if needed). Select this folder and click **Create**.

## 2. Configure Local Network Permissions (Info.plist)

Because the Companion app must connect to the local server (via LAN) and discover it using Bonjour, we must explicitly declare our intentions in the App's properties to satisfy iOS privacy requirements.

1. In Xcode's Project Navigator (left sidebar), click the top-level **GuiltyPartyCompanion** project file.
2. Select the **GuiltyPartyCompanion** target in the main window.
3. Go to the **Info** tab.
4. Hover over any existing key in the "Custom iOS Target Properties" list and click the **+** button that appears to add a new row.
5. Add the following keys:
    *   **Key:** `Privacy - Local Network Usage Description` (`NSLocalNetworkUsageDescription`)
    *   **Type:** `String`
    *   **Value:** `Guilty Party uses the local network to discover and connect to the Host Server.`
    *   **Key:** `Bonjour services` (`NSBonjourServices`)
    *   **Type:** `Array`
    *   **Value:** Expand the array, add an item: `_guiltyparty._tcp`

## 3. Implement Basic View and Networking Scaffold

By default, Xcode created a `ContentView.swift`. For the MVP scaffold, we will update it to show the App's status and prepare for the `URLSessionWebSocketTask` connection.

Replace the contents of `ContentView.swift` with the following placeholder logic:

```swift
import SwiftUI

struct ContentView: View {
    @State private var connectionStatus = "Disconnected"
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .imageScale(.large)
                .foregroundStyle(.tint)
            
            Text("Guilty Party Companion")
                .font(.title)
                .bold()
            
            Text("Status: \(connectionStatus)")
                .foregroundColor(connectionStatus == "Connected" ? .green : .red)
            
            Button("Connect to Server") {
                connectToServer()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
    
    private func connectToServer() {
        // Scaffold: Connect to localhost via WebSocket
        connectionStatus = "Connecting..."
        guard let url = URL(string: "ws://127.0.0.1:3000/ws") else { return }
        
        let session = URLSession(configuration: .default)
        let webSocketTask = session.webSocketTask(with: url)
        
        webSocketTask.resume()
        
        // Simple ping to test connection
        let message = URLSessionWebSocketTask.Message.string("Companion Joined")
        webSocketTask.send(message) { error in
            DispatchQueue.main.async {
                if let error = error {
                    self.connectionStatus = "Error: \(error.localizedDescription)"
                } else {
                    self.connectionStatus = "Connected"
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
```

## 4. Run the App

1. Ensure your Local Server is running (`make run-server` from the root of the repo).
2. In Xcode, select a Simulator (e.g., iPhone 15) from the device dropdown at the top.
3. Press the **Play** button (or `Cmd + R`) to build and run the app.
4. Click "Connect to Server" and verify the status changes to "Connected". (You should also see the connection logged in the Rust server terminal).
