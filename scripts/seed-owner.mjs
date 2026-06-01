/**
 * Script untuk membuat dokumen Owner di Firestore.
 * Jalankan SETELAH login Google pertama kali ke app.
 *
 * Usage:
 *   node scripts/seed-owner.mjs <UID> <EMAIL> <DISPLAY_NAME>
 *
 * Contoh:
 *   node scripts/seed-owner.mjs abc123uid indrajamz@gmail.com "Indra"
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const [,, uid, email, displayName] = process.argv

if (!uid || !email) {
  console.error('Usage: node scripts/seed-owner.mjs <UID> <EMAIL> [DISPLAY_NAME]')
  console.error('\nCara dapat UID:')
  console.error('  Firebase Console → Authentication → Users → copy UID kamu')
  process.exit(1)
}

// Coba pakai Application Default Credentials (firebase CLI login sudah cukup)
let app
try {
  app = initializeApp({ projectId: 'tehpoci-pos' })
} catch (e) {
  // App sudah init
}

const db = getFirestore()

const ownerData = {
  uid,
  email,
  display_name: displayName || email.split('@')[0],
  role: 'OWNER',
  is_active: true,
  assigned_store: 'branch_01',
  created_at: new Date().toISOString(),
}

try {
  await db.collection('users').doc(uid).set(ownerData)
  console.log('✅ Owner berhasil dibuat di Firestore:')
  console.log(JSON.stringify(ownerData, null, 2))

  // Buat juga dokumen store utama
  await db.collection('stores').doc('branch_01').set({
    name: 'Teh Poci - Cabang Utama',
    address: '',
    created_at: new Date().toISOString(),
  })
  console.log('✅ Store branch_01 berhasil dibuat')
} catch (e) {
  console.error('❌ Gagal:', e.message)
  process.exit(1)
}
