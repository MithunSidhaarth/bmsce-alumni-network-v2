"use client";

import { useEffect, useState } from "react";
import { sendTestPush } from "@/app/push/actions";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";
import { said } from "@/lib/fail";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Push = "checking" | "unsupported" | "unconfigured" | "blocked" | "off" | "on";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * This device: install the site as an app, and turn push notifications on or
 * off. Every state is reported as it is; nothing claims to be on when it is not.
 */
export default function DeviceSetup() {
  const [push, setPush] = useState<Push>("checking");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [installer, setInstaller] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstaller(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstaller(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setPush("unsupported");
      if (!KEY) return setPush("unconfigured");
      if (Notification.permission === "denied") return setPush("blocked");
      const reg = await navigator.serviceWorker.ready;
      setPush((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setPush("unsupported"));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const json = sub.toJSON();
      const { error } = await createClient().rpc("push_subscribe", { p_endpoint: json.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth });
      if (error) {
        await sub.unsubscribe();
        throw new Error(error.message);
      }
      setPush("on");
      setNote("Notifications are on for this device.");
    } catch (e) {
      setNote(said(e) ?? "Notifications could not be turned on.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await createClient().rpc("push_unsubscribe", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setPush("off");
      setNote("Notifications are off for this device.");
    } catch {
      setNote("That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await sendTestPush();
      setNote(!r.configured ? "The server is not set up to send notifications yet." : r.sent > 0 ? "Sent. It should arrive in a moment." : "The test could not be delivered to this device.");
    } catch (e) {
      setNote(said(e) ?? "The test could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const status: Record<Push, string> = {
    checking: "Checking this device",
    unsupported: ios
      ? "On an iPhone or iPad, add the site to your Home Screen first; notifications work from the installed app."
      : "This browser cannot show push notifications.",
    unconfigured: "Notifications are not set up on this server yet.",
    blocked: "Notifications are blocked for this site in your browser settings. Allow them there, then come back.",
    off: "Get a notification for new messages, replies and mentions, even when the site is closed.",
    on: "On for this device: new messages, replies and mentions will reach you here.",
  };

  return (
    <section aria-labelledby="device-title" className="sheet px-5 py-5 sm:px-6">
      <h2 id="device-title" className="font-display text-xl">
        This device
      </h2>

      <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-ink/10 pt-4">
        <Icon name="bell" className="mt-0.5 h-5 w-5 text-ink/60" />
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[0.9375rem] font-semibold">Push notifications</p>
          <p className="mt-0.5 text-sm text-ink/65">{status[push]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {push === "off" && (
            <button type="button" onClick={turnOn} disabled={busy} className="btn btn-sm">
              Turn on
            </button>
          )}
          {push === "on" && (
            <>
              <button type="button" onClick={test} disabled={busy} className="btn btn-sm btn-ghost">
                Send a test
              </button>
              <button type="button" onClick={turnOff} disabled={busy} className="btn btn-sm btn-ghost">
                Turn off
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-ink/10 pt-4">
        <Icon name="home" className="mt-0.5 h-5 w-5 text-ink/60" />
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[0.9375rem] font-semibold">Install as an app</p>
          <p className="mt-0.5 text-sm text-ink/65">
            {installed
              ? "Installed: you are using the app."
              : installer
              ? "Put the network on your home screen. It opens full screen, like any other app."
              : ios
              ? "In Safari, tap Share, then Add to Home Screen."
              : "Use your browser's menu and choose Install app or Add to Home Screen."}
          </p>
        </div>
        {installer && !installed && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await installer.prompt();
              const choice = await installer.userChoice;
              if (choice.outcome === "accepted") setInstalled(true);
              setInstaller(null);
            }}
          >
            Install
          </button>
        )}
      </div>

      <p role="status" className="mt-3 min-h-5 text-sm text-forest">
        {note}
      </p>
    </section>
  );
}
