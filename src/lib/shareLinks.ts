"use client";

import { makeRoomId } from "./rooms";

export function appLink(params: Record<string, string>) {
  const url = new URL(window.location.href);
  url.search = "";
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export function roomLink(floor: number, room: number) {
  return appLink({ room: makeRoomId(floor, room) });
}

export function userLink(slackId: string) {
  return appLink({ user: slackId });
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("input");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
