// backend/scripts/loadtest-meeting.ts uchun soxta ishtirokchi sahifasi
// (public/loadtest-client.html) mediasoup-client va socket.io-client'ni
// CDN orqali (jsdelivr +esm) yuklashga urinib, ba'zi ichki bog'liqliklarni
// (masalan "events-alias@npm:events@^3.3.0") to'g'ri hal qila olmay 404
// bilan yiqilib qolgan edi. Shu sabab ikkalasini shu yerda, LOYIHANING
// O'Z node_modules'idagi (production bilan bir xil) versiyalaridan
// to'g'ridan-to'g'ri paketlab (bundle), tayyor holda public/'ga qo'yamiz —
// hech qanday tashqi CDN'ga bog'liqlik qolmaydi.
import { Device } from "mediasoup-client"
import { io } from "socket.io-client"

window.mediasoupClient = { Device }
window.io = io
