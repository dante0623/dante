const bookingUrl = "https://mellojoylucky.cn";
const venues = {
  harajuku: { label: "原宿", detail: "当日を含む7日間が対象。毎日13:00に、7日目の予約枠が公開されます。", daysBefore: 6 },
  shibuya: { label: "渋谷", detail: "翌日分の入店予約を毎日13:00から受付。開催状況は公式案内で確認してください。", daysBefore: 1 },
};
const state = JSON.parse(localStorage.getItem("mellojoy-assistant") || "{}");
const $ = (selector) => document.querySelector(selector);
let selectedVenue = state.venue || "harajuku";

function saveState() { localStorage.setItem("mellojoy-assistant", JSON.stringify(state)); }
function localDate(value) { return new Date(`${value}T00:00:00`); }
function ymd(date) { return date.toISOString().slice(0, 10); }
function applyVenue() {
  document.querySelectorAll(".venue-choice").forEach((button) => button.classList.toggle("active", button.dataset.venue === selectedVenue));
  $("#venue-detail").textContent = venues[selectedVenue].detail;
  state.venue = selectedVenue; saveState(); updateRelease();
}
function releaseDate() {
  const date = $("#visit-date").value;
  if (!date) return null;
  const release = localDate(date); release.setDate(release.getDate() - venues[selectedVenue].daysBefore); release.setHours(13, 0, 0, 0);
  return release;
}
function updateRelease() {
  const release = releaseDate();
  if (!release) { $("#release-label").textContent = "日付を選ぶと受付開始時刻を表示します"; return; }
  const formatted = new Intl.DateTimeFormat("ja-JP", { month:"long", day:"numeric", weekday:"short", hour:"2-digit", minute:"2-digit", hour12:false }).format(release);
  $("#release-label").textContent = `${venues[selectedVenue].label}の受付開始予定：${formatted}`;
}
function updateCountdown() {
  const release = releaseDate();
  if (!release) { $("#countdown-time").textContent = "--:--:--"; return; }
  const diff = release - new Date();
  if (diff <= 0) {
    $("#countdown-time").textContent = "受付時刻を過ぎました";
    const key = `notified-${selectedVenue}-${$("#visit-date").value}`;
    if ("Notification" in window && Notification.permission === "granted" && !sessionStorage.getItem(key)) {
      new Notification(`Mellojoy ${venues[selectedVenue].label}`, { body: "予約受付の予定時刻です。公式ページを手動で確認してください。" });
      sessionStorage.setItem(key, "1");
    }
    return;
  }
  const seconds = Math.floor(diff / 1000); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60);
  $("#countdown-time").textContent = `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;
}
function downloadCalendar() {
  const release = releaseDate(); if (!release) return alert("先に来店希望日を選んでください。");
  const start = new Date(release - 5 * 60 * 1000); const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const content = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${stamp(start)}\nDTEND:${stamp(release)}\nSUMMARY:Mellojoy ${venues[selectedVenue].label} 予約受付\nDESCRIPTION:公式予約ページを手動で確認：${bookingUrl}\nEND:VEVENT\nEND:VCALENDAR`;
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], {type:"text/calendar"})); link.download = "mellojoy-reservation-reminder.ics"; link.click(); URL.revokeObjectURL(link.href);
}
function init() {
  const today = new Date(); $("#visit-date").min = ymd(today); $("#visit-date").value = state.date || ymd(today); $("#visit-time").value = state.time || "13:00"; $("#priority").value = state.priority || "harajuku";
  $("#saved-note").textContent = state.date ? "この端末に希望を保存しています。" : "希望日時を選んで保存できます。";
  $("#confirmation-status").textContent = state.confirmed ? "予約済み（手動確認）" : "未確認"; $("#confirmation-status").className = `status ${state.confirmed ? "confirmed" : "pending"}`;
  if (state.confirmed) $("#confirm-booking").textContent = "予約済みの記録を取り消す";
  if (state.lastChecked) $("#checked-note").textContent = `最終手動確認：${state.lastChecked}`;
  applyVenue(); updateCountdown(); setInterval(updateCountdown, 1000);
}
document.querySelectorAll(".venue-choice").forEach((button) => button.addEventListener("click", () => { selectedVenue = button.dataset.venue; applyVenue(); }));
$("#visit-date").addEventListener("change", updateRelease);
$("#save-preference").addEventListener("click", () => { state.date=$("#visit-date").value; state.time=$("#visit-time").value; state.priority=$("#priority").value; saveState(); $("#saved-note").textContent="保存しました。この端末のブラウザにのみ保存されます。"; updateRelease(); updateCountdown(); });
$("#notification-button").addEventListener("click", async () => { if (!("Notification" in window)) return alert("このブラウザでは通知を利用できません。"); const result = await Notification.requestPermission(); alert(result === "granted" ? "通知を許可しました。ページを開いている間に受付時刻をお知らせします。" : "通知は許可されていません。"); });
$("#calendar-button").addEventListener("click", downloadCalendar);
$("#record-check").addEventListener("click", () => { const now = new Intl.DateTimeFormat("ja-JP", { dateStyle:"short", timeStyle:"short" }).format(new Date()); state.lastChecked = now; saveState(); $("#checked-note").textContent=`最終手動確認：${now}`; });
$("#confirm-booking").addEventListener("click", () => { state.confirmed = !state.confirmed; saveState(); $("#confirmation-status").textContent=state.confirmed ? "予約済み（手動確認）" : "未確認"; $("#confirmation-status").className=`status ${state.confirmed ? "confirmed" : "pending"}`; $("#confirm-booking").textContent=state.confirmed ? "予約済みの記録を取り消す" : "手動で予約済みにする"; });
init();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}
