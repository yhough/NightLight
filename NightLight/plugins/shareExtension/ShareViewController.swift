// ShareViewController.swift
// NightLightShareExtension – Impulse Firewall
//
// A SwiftUI-backed share extension that lets the user decide what to do
// with text they almost sent. Dark UI (#0D0D0D), matching NightLight's aesthetic.

import UIKit
import SwiftUI
import Social
import MobileCoreServices
import UserNotifications
import UniformTypeIdentifiers

// MARK: - Queue item model

struct QueueItem: Codable {
    let id: String
    let text: String
    let timestamp: Int64          // unix ms
    var status: String            // "cooling" | "held" | "draft" | "ready"
    var sendAt: Int64?            // unix ms, optional
}

// MARK: - App Group UserDefaults helpers

private let appGroup = "group.com.nightlight.app"
private let queueKey  = "nightlight_queue"

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

private func appendQueueItem(_ item: QueueItem) {
    var items = loadQueue()
    items.append(item)
    saveQueue(items)
}

// MARK: - Notification helpers

private func scheduleNotification(at fireDate: Date, id: String) {
    let center = UNUserNotificationCenter.current()

    let content = UNMutableNotificationContent()
    content.title = "Something's waiting."
    content.body  = "Something you wrote earlier is waiting. No rush."
    content.sound = .default

    // Deep link so tapping the notification opens the queue
    content.userInfo = ["url": "nightlight://queue"]

    let comps    = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: fireDate)
    let trigger  = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
    let request  = UNNotificationRequest(identifier: "nightlight_queue_\(id)", content: content, trigger: trigger)

    center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
        center.add(request) { _ in }
    }
}

private func tomorrow8am() -> Date {
    let cal   = Calendar.current
    let today = cal.startOfDay(for: Date())
    let tomorrow = cal.date(byAdding: .day, value: 1, to: today)!
    return cal.date(bySettingHour: 8, minute: 0, second: 0, of: tomorrow)!
}

// MARK: - SwiftUI sheet

struct ImpulseSheetView: View {

    let sharedText: String
    let onAction: (ImpulseAction) -> Void

    // Colours matching NightLight
    private let bg       = Color(red: 0.051, green: 0.051, blue: 0.051)   // #0D0D0D
    private let gold     = Color(red: 0.910, green: 0.690, blue: 0.188)   // #E8B030
    private let pink     = Color(red: 0.910, green: 0.333, blue: 0.541)   // #E8558A
    private let textDim  = Color.white.opacity(0.55)
    private let border   = Color.white.opacity(0.08)

    private var isLateNight: Bool {
        let hour = Calendar.current.component(.hour, from: Date())
        return hour >= 22 || hour < 5
    }

    private var sentAtString: String {
        let f = DateFormatter()
        f.dateFormat = "h:mma"
        f.amSymbol = "am"
        f.pmSymbol = "pm"
        return "Sent at \(f.string(from: Date()))"
    }

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {

                // ── Header ─────────────────────────────────────────────────
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Impulse Check")
                            .font(.system(size: 18, weight: .semibold, design: .default))
                            .foregroundColor(.white)
                        if isLateNight {
                            Text(sentAtString)
                                .font(.system(size: 13, weight: .regular))
                                .foregroundColor(gold.opacity(0.75))
                        }
                    }
                    Spacer()
                    Image(systemName: "moon.fill")
                        .foregroundColor(gold)
                        .font(.system(size: 20))
                }
                .padding(.horizontal, 24)
                .padding(.top, 28)
                .padding(.bottom, 16)

                // ── Message preview ────────────────────────────────────────
                Text(sharedText)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundColor(textDim)
                    .lineLimit(5)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(border, lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                    .padding(.bottom, 28)

                // ── Action buttons ─────────────────────────────────────────
                VStack(spacing: 12) {
                    ActionButton(
                        label: "Send now",
                        icon: "paperplane.fill",
                        accent: gold,
                        bg: bg,
                        action: { onAction(.sendNow) }
                    )
                    ActionButton(
                        label: "Give it 15 minutes",
                        icon: "clock.fill",
                        accent: gold,
                        bg: bg,
                        action: { onAction(.cool) }
                    )
                    ActionButton(
                        label: "Hold until morning",
                        icon: "moon.zzz.fill",
                        accent: pink,
                        bg: bg,
                        action: { onAction(.holdMorning) }
                    )
                    ActionButton(
                        label: "Save as a draft",
                        icon: "doc.fill",
                        accent: Color.white.opacity(0.6),
                        bg: bg,
                        action: { onAction(.saveDraft) }
                    )
                    ActionButton(
                        label: "Delete this",
                        icon: "trash.fill",
                        accent: Color.red.opacity(0.7),
                        bg: bg,
                        action: { onAction(.delete) }
                    )
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }
}

// MARK: - Individual action button

struct ActionButton: View {
    let label: String
    let icon: String
    let accent: Color
    let bg: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(accent)
                    .frame(width: 22)
                Text(label)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                Spacer()
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 18)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(accent.opacity(0.18), lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Actions

enum ImpulseAction {
    case sendNow
    case cool
    case holdMorning
    case saveDraft
    case delete
}

// MARK: - UIViewController bridge

class ShareViewController: UIViewController {

    private var hostingController: UIHostingController<ImpulseSheetView>?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.051, green: 0.051, blue: 0.051, alpha: 1)
        extractSharedText { [weak self] text in
            DispatchQueue.main.async {
                self?.presentSheet(text: text ?? "")
            }
        }
    }

    // ── Extract text from the extension context ────────────────────────────
    private func extractSharedText(completion: @escaping (String?) -> Void) {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            completion(nil)
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                // Prefer plain text
                let textType = UTType.plainText.identifier
                let urlType  = UTType.url.identifier

                if provider.hasItemConformingToTypeIdentifier(textType) {
                    provider.loadItem(forTypeIdentifier: textType, options: nil) { data, _ in
                        if let text = data as? String {
                            completion(text)
                        } else {
                            completion(nil)
                        }
                    }
                    return
                } else if provider.hasItemConformingToTypeIdentifier(urlType) {
                    provider.loadItem(forTypeIdentifier: urlType, options: nil) { data, _ in
                        if let url = data as? URL {
                            completion(url.absoluteString)
                        } else {
                            completion(nil)
                        }
                    }
                    return
                }
            }
        }
        completion(nil)
    }

    // ── Present the SwiftUI sheet ──────────────────────────────────────────
    private func presentSheet(text: String) {
        let sheet = ImpulseSheetView(sharedText: text) { [weak self] action in
            self?.handleAction(action, text: text)
        }
        let hc = UIHostingController(rootView: sheet)
        hc.view.backgroundColor = .clear

        addChild(hc)
        view.addSubview(hc.view)
        hc.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hc.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hc.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hc.view.topAnchor.constraint(equalTo: view.topAnchor),
            hc.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        hc.didMove(toParent: self)
        self.hostingController = hc
    }

    // ── Handle each action ─────────────────────────────────────────────────
    private func handleAction(_ action: ImpulseAction, text: String) {
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let id  = UUID().uuidString

        switch action {
        case .sendNow:
            // Copy to clipboard so user can paste immediately
            UIPasteboard.general.string = text

        case .cool:
            let sendAt = now + 15 * 60 * 1000
            let item = QueueItem(
                id: id,
                text: text,
                timestamp: now,
                status: "cooling",
                sendAt: sendAt
            )
            appendQueueItem(item)
            scheduleNotification(
                at: Date(timeIntervalSince1970: Double(sendAt) / 1000.0),
                id: id
            )

        case .holdMorning:
            let fireDate = tomorrow8am()
            let sendAt   = Int64(fireDate.timeIntervalSince1970 * 1000)
            let item = QueueItem(
                id: id,
                text: text,
                timestamp: now,
                status: "held",
                sendAt: sendAt
            )
            appendQueueItem(item)
            scheduleNotification(at: fireDate, id: id)

        case .saveDraft:
            let item = QueueItem(
                id: id,
                text: text,
                timestamp: now,
                status: "draft",
                sendAt: nil
            )
            appendQueueItem(item)

        case .delete:
            break // nothing to persist
        }

        completeExtension()
    }

    private func completeExtension() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
