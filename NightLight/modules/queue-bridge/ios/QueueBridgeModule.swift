// QueueBridgeModule.swift
// Expo native module – reads/writes the share-extension queue from the App Group UserDefaults.

import ExpoModulesCore
import Foundation

// MARK: - Data model (mirrors the Swift struct in the share extension)

private struct QueueItem: Codable {
    let id: String
    let text: String
    let timestamp: Int64
    var status: String
    var sendAt: Int64?
}

// MARK: - Module

public class QueueBridgeModule: Module {

    private let appGroup  = "group.com.nightlight.app"
    private let queueKey  = "nightlight_queue"

    // MARK: Expo module definition

    public func definition() -> ModuleDefinition {
        Name("QueueBridge")

        // ── getQueueItems ────────────────────────────────────────────────
        AsyncFunction("getQueueItems") { () -> [[String: Any]] in
            return self.loadQueue().map { self.itemToDict($0) }
        }

        // ── removeQueueItem ──────────────────────────────────────────────
        AsyncFunction("removeQueueItem") { (id: String) in
            var items = self.loadQueue()
            items.removeAll { $0.id == id }
            self.saveQueue(items)
        }

        // ── updateQueueItemStatus ────────────────────────────────────────
        AsyncFunction("updateQueueItemStatus") { (id: String, status: String) in
            var items = self.loadQueue()
            if let idx = items.firstIndex(where: { $0.id == id }) {
                items[idx].status = status
                self.saveQueue(items)
            }
        }
    }

    // MARK: Helpers

    private func loadQueue() -> [QueueItem] {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let data     = defaults.data(forKey: queueKey),
            let items    = try? JSONDecoder().decode([QueueItem].self, from: data)
        else { return [] }
        return items
    }

    private func saveQueue(_ items: [QueueItem]) {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let data     = try? JSONEncoder().encode(items)
        else { return }
        defaults.set(data, forKey: queueKey)
    }

    private func itemToDict(_ item: QueueItem) -> [String: Any] {
        var dict: [String: Any] = [
            "id":        item.id,
            "text":      item.text,
            "timestamp": item.timestamp,
            "status":    item.status,
        ]
        if let sendAt = item.sendAt {
            dict["sendAt"] = sendAt
        }
        return dict
    }
}
