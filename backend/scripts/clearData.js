/**
 * LearnSphere — Data Cleanup Script
 * 
 * Clears all runtime data for a clean GitHub push:
 *   - MongoDB: users, answers, documents, verification requests
 *   - FAISS: verified_meta.json, docs_meta.json
 * 
 * HOW TO RUN (manually only):
 *   cd backend
 *   node scripts/clearData.js
 * 
 * This script NEVER runs automatically.
 * It has NO connection to server.js or any route.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── FAISS file paths ──────────────────────────────
const FAISS_DIR = path.join(__dirname, '../faiss');
const FAISS_FILES = [
  path.join(FAISS_DIR, 'docs_meta.json'),
  path.join(FAISS_DIR, 'verified_meta.json'),
  path.join(FAISS_DIR, 'docs.index'),
  path.join(FAISS_DIR, 'verified.index'),
];

// ── MongoDB models ────────────────────────────────
const User = require('../src/models/User');
const Answer = require('../src/models/Answer');
const Document = require('../src/models/Document');
const VerificationRequest = require('../src/models/VerificationRequest');

// ── Confirm before running ────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const run = async () => {
  console.log('\n========================================');
  console.log('  LearnSphere — Data Cleanup Script');
  console.log('========================================\n');

  console.log('This will permanently delete:');
  console.log('  ✖ All users (students + teachers)');
  console.log('  ✖ All answers');
  console.log('  ✖ All uploaded documents');
  console.log('  ✖ All verification requests');
  console.log('  ✖ All FAISS embeddings\n');

  const confirm = await ask('Are you sure? Type YES to continue: ');

  if (confirm.trim() !== 'YES') {
    console.log('\n❌ Cancelled — nothing was deleted.\n');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  // ── Clear MongoDB collections ─────────────────
  console.log('🗑  Clearing MongoDB collections...');

  const u = await User.deleteMany({});
  console.log(`   Users deleted: ${u.deletedCount}`);

  const a = await Answer.deleteMany({});
  console.log(`   Answers deleted: ${a.deletedCount}`);

  const d = await Document.deleteMany({});
  console.log(`   Documents deleted: ${d.deletedCount}`);

  const v = await VerificationRequest.deleteMany({});
  console.log(`   Verification requests deleted: ${v.deletedCount}`);

  // ── Clear FAISS files ─────────────────────────
  console.log('\n🗑  Clearing FAISS files...');

  for (const filePath of FAISS_FILES) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   Deleted: ${path.basename(filePath)}`);
    } else {
      console.log(`   Not found (skipped): ${path.basename(filePath)}`);
    }
  }

  console.log('\n✅ All data cleared successfully!');
  console.log('✅ System is clean and ready for GitHub.\n');

  await mongoose.disconnect();
  rl.close();
  process.exit(0);
};

run().catch(err => {
  console.error('\n❌ Error during cleanup:', err.message);
  mongoose.disconnect();
  rl.close();
  process.exit(1);
});