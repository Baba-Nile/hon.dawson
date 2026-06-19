/* ============================================================
   Hon. Dawson Mudenyo Campaign — Firebase Inline Admin System
   ------------------------------------------------------------
   Drop this script (after Firebase SDK scripts) on any page to
   enable password-protected inline editing of every element
   carrying a data-editable or data-editable-img attribute.
   Content is persisted to Firestore so it survives reloads and
   syncs across visitors.

   SETUP REQUIRED:
   1. Replace FIREBASE_CONFIG below with your real project config
      from the Firebase console (Project settings > General).
   2. In Firestore, no manual setup needed — collections/docs are
      created automatically on first save.
   3. Set your own admin password in ADMIN_PASSWORD_HASH (see the
      instructions further down on how to generate a hash).
   4. Recommended Firestore security rules are documented at the
      bottom of this file.
   ============================================================ */

(function () {
  'use strict';

  /* ===== 1. FIREBASE CONFIG — REPLACE WITH YOUR OWN ===== */
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  /* ===== 2. ADMIN PASSWORD =====
     Default password (works immediately, no setup needed): Kwanza2027
     To change it, just edit ADMIN_PASSWORD_PLAIN below to your own password.
     For production, consider pairing this with Firebase Auth for a real
     login system instead of a single shared password.
  */
  const ADMIN_PASSWORD_PLAIN = "Kwanza2027";

  /* ===== INTERNAL STATE ===== */
  let db = null;
  let storage = null;
  let firebaseReady = false;
  let isEditing = false;
  const PAGE_ID = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const SESSION_KEY = 'dm_admin_session';
  const pendingSaves = new Map();
  let saveTimer = null;

  /* ===== INIT FIREBASE ===== */
  function initFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        console.warn('[Admin] Firebase SDK not loaded. Inline editing UI will still work locally but will not persist.');
        return;
      }
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.firestore();
      try { storage = firebase.storage(); } catch (e) { /* storage SDK optional */ }
      firebaseReady = true;
    } catch (err) {
      console.warn('[Admin] Firebase init failed — check FIREBASE_CONFIG in firebase-admin.js', err);
    }
  }

  /* ===== PASSWORD CHECK ===== */
  async function checkPassword(input) {
    return input === ADMIN_PASSWORD_PLAIN;
  }

  /* ===== UI: LOGIN MODAL ===== */
  function buildLoginModal() {
    if (document.getElementById('adminLoginOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'adminLoginOverlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-close" id="adminModalClose">✕</div>
        <h3>Admin Access</h3>
        <p>Enter the campaign admin password to edit content on this page.</p>
        <input type="password" class="form-control" id="adminPasswordInput" placeholder="Password" autocomplete="off" />
        <div class="admin-modal-error" id="adminModalError">Incorrect password. Try again.</div>
        <div class="admin-modal-actions">
          <button class="btn btn-outline btn-sm" id="adminCancelBtn" type="button">Cancel</button>
          <button class="btn btn-primary btn-sm" id="adminSubmitBtn" type="button">Unlock Editing</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#adminPasswordInput');
    const errorEl = overlay.querySelector('#adminModalError');

    function closeModal() {
      overlay.classList.remove('active');
      input.value = '';
      errorEl.classList.remove('show');
    }

    overlay.querySelector('#adminModalClose').addEventListener('click', closeModal);
    overlay.querySelector('#adminCancelBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    async function submit() {
      const val = input.value;
      const ok = await checkPassword(val);
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, '1');
        closeModal();
        enableEditing();
      } else {
        errorEl.classList.add('show');
        input.focus();
      }
    }

    overlay.querySelector('#adminSubmitBtn').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  function openLoginModal() {
    buildLoginModal();
    const overlay = document.getElementById('adminLoginOverlay');
    overlay.classList.add('active');
    setTimeout(() => overlay.querySelector('#adminPasswordInput').focus(), 100);
  }

  /* ===== UI: EDIT MODE BANNER ===== */
  function buildEditBanner() {
    if (document.getElementById('editModeBanner')) return;
    const banner = document.createElement('div');
    banner.className = 'edit-mode-banner';
    banner.id = 'editModeBanner';
    banner.innerHTML = `
      <span>✏️ Editing mode is on — click any highlighted text or image to change it. Changes save automatically.</span>
      <button class="btn btn-ghost btn-sm" id="exitEditBtn" type="button">Exit Editing</button>
    `;
    document.body.prepend(banner);
    banner.querySelector('#exitEditBtn').addEventListener('click', disableEditing);
  }

  /* ===== UI: SAVE INDICATOR ===== */
  function buildSaveIndicator() {
    if (document.getElementById('adminSaveIndicator')) return;
    const el = document.createElement('div');
    el.className = 'admin-save-indicator';
    el.id = 'adminSaveIndicator';
    el.innerHTML = `<span class="dot"></span><span class="msg">Saved</span>`;
    document.body.appendChild(el);
  }

  function showSaveIndicator(state) {
    buildSaveIndicator();
    const el = document.getElementById('adminSaveIndicator');
    const msg = el.querySelector('.msg');
    el.classList.toggle('saving', state === 'saving');
    msg.textContent = state === 'saving' ? 'Saving…' : state === 'error' ? 'Save failed — check connection' : 'Saved';
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ===== ADMIN TRIGGER BUTTON ===== */
  function buildAdminTrigger() {
    if (document.getElementById('adminTriggerBtn')) return;
    const btn = document.createElement('div');
    btn.className = 'admin-trigger';
    btn.id = 'adminTriggerBtn';
    btn.title = 'Admin login';
    btn.innerHTML = '🔒';
    btn.addEventListener('click', () => {
      if (isEditing) {
        disableEditing();
      } else if (sessionStorage.getItem(SESSION_KEY) === '1') {
        enableEditing();
      } else {
        openLoginModal();
      }
    });
    document.body.appendChild(btn);
  }

  /* ===== ENABLE / DISABLE EDITING ===== */
  function enableEditing() {
    isEditing = true;
    document.body.classList.add('editing-active');
    buildEditBanner();
    document.getElementById('editModeBanner').classList.add('active');
    const trigger = document.getElementById('adminTriggerBtn');
    if (trigger) { trigger.classList.add('is-active'); trigger.innerHTML = '🔓'; trigger.title = 'Exit editing'; }

    document.querySelectorAll('[data-editable]').forEach(setupEditableText);
    document.querySelectorAll('[data-editable-img]').forEach(setupEditableImage);
  }

  function disableEditing() {
    isEditing = false;
    document.body.classList.remove('editing-active');
    const banner = document.getElementById('editModeBanner');
    if (banner) banner.classList.remove('active');
    const trigger = document.getElementById('adminTriggerBtn');
    if (trigger) { trigger.classList.remove('is-active'); trigger.innerHTML = '🔒'; trigger.title = 'Admin login'; }
    document.querySelectorAll('[data-editable]').forEach(el => { el.contentEditable = 'false'; });
  }

  /* ===== TEXT EDITING ===== */
  function setupEditableText(el) {
    if (el._editableBound) return;
    el._editableBound = true;
    el.contentEditable = 'true';
    el.spellcheck = false;

    el.addEventListener('focus', () => { el.dataset._before = el.innerHTML; });
    el.addEventListener('blur', () => {
      if (el.innerHTML !== el.dataset._before) {
        queueSave(el);
      }
    });
    el.addEventListener('keydown', (e) => {
      // Prevent Enter from creating new block elements inside inline labels/headings if undesired
      if (e.key === 'Enter' && el.dataset.editableSingleline === 'true') {
        e.preventDefault();
        el.blur();
      }
    });
  }

  function getEditableKey(el) {
    const key = el.getAttribute('data-editable');
    return `${PAGE_ID}__${key}`;
  }

  function queueSave(el) {
    const key = getEditableKey(el);
    pendingSaves.set(key, { type: 'text', value: el.innerHTML, el });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSaves, 400);
  }

  async function flushSaves() {
    if (!pendingSaves.size) return;
    showSaveIndicator('saving');
    const entries = Array.from(pendingSaves.entries());
    pendingSaves.clear();

    if (!firebaseReady || !db) {
      // No Firebase configured — keep changes in DOM only for this session.
      showSaveIndicator('saved');
      return;
    }

    try {
      const batch = db.batch();
      entries.forEach(([key, data]) => {
        const ref = db.collection('siteContent').doc(key);
        batch.set(ref, {
          page: PAGE_ID,
          type: data.type,
          value: data.value,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
      showSaveIndicator('saved');
    } catch (err) {
      console.error('[Admin] Save failed', err);
      showSaveIndicator('error');
    }
  }

  /* ===== IMAGE EDITING ===== */
  function setupEditableImage(wrapper) {
    if (wrapper._imgBound) return;
    wrapper._imgBound = true;

    const overlay = document.createElement('div');
    overlay.className = 'edit-img-overlay';
    overlay.innerHTML = '<span>🖼️</span><small>Click to change image</small>';
    wrapper.style.position = wrapper.style.position || 'relative';
    wrapper.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      promptImageChange(wrapper);
    });
  }

  function promptImageChange(wrapper) {
    const choice = window.prompt(
      'Paste an image URL (e.g. an Unsplash link) to use here.\nOr type "upload" to choose a file from your device.'
    );
    if (choice === null) return;
    if (choice.trim().toLowerCase() === 'upload') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) uploadImageFile(wrapper, file);
      });
      input.click();
      return;
    }
    if (choice.trim()) {
      applyImageSrc(wrapper, choice.trim());
      saveImageValue(wrapper, choice.trim());
    }
  }

  function applyImageSrc(wrapper, url) {
    const img = wrapper.tagName === 'IMG' ? wrapper : wrapper.querySelector('img');
    if (img) img.src = url;
    else wrapper.style.backgroundImage = `url('${url}')`;
  }

  async function uploadImageFile(wrapper, file) {
    if (!firebaseReady || !storage) {
      alert('Image upload needs Firebase Storage configured. Paste an image URL instead, or set up Storage in firebase-admin.js.');
      return;
    }
    showSaveIndicator('saving');
    try {
      const key = getEditableKey(wrapper.matches('[data-editable-img]') ? wrapper : wrapper.closest('[data-editable-img]'));
      const path = `siteImages/${key}-${Date.now()}-${file.name}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      applyImageSrc(wrapper, url);
      saveImageValue(wrapper, url);
    } catch (err) {
      console.error('[Admin] Upload failed', err);
      showSaveIndicator('error');
    }
  }

  function saveImageValue(wrapperOrImg, url) {
    const wrapper = wrapperOrImg.matches('[data-editable-img]') ? wrapperOrImg : wrapperOrImg.closest('[data-editable-img]');
    const key = getEditableKey(wrapper);
    pendingSaves.set(key, { type: 'image', value: url });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSaves, 200);
  }

  /* ===== LOAD SAVED CONTENT ON PAGE LOAD ===== */
  async function loadSavedContent() {
    if (!firebaseReady || !db) return;
    try {
      const snap = await db.collection('siteContent').where('page', '==', PAGE_ID).get();
      snap.forEach(doc => {
        const data = doc.data();
        const shortKey = doc.id.replace(`${PAGE_ID}__`, '');
        if (data.type === 'text') {
          const el = document.querySelector(`[data-editable="${shortKey}"]`);
          if (el) el.innerHTML = data.value;
        } else if (data.type === 'image') {
          const wrapper = document.querySelector(`[data-editable-img="${shortKey}"]`);
          if (wrapper) applyImageSrc(wrapper, data.value);
        }
      });
    } catch (err) {
      console.warn('[Admin] Could not load saved content (this is expected if Firebase is not yet configured)', err);
    }
  }

  /* ===== BOOTSTRAP ===== */
  function boot() {
    initFirebase();
    buildAdminTrigger();
    loadSavedContent().then(() => {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        enableEditing();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose minimal API for debugging / manual triggers
  window.DMAdmin = { enableEditing, disableEditing, openLoginModal };
})();

/* ============================================================
   RECOMMENDED FIRESTORE SECURITY RULES
   ------------------------------------------------------------
   Paste into Firebase Console > Firestore Database > Rules.
   This allows anyone to READ content (so visitors see edits)
   but editing happens client-side gated by the password prompt
   above. For stronger protection, pair this with Firebase Auth
   and restrict writes to authenticated admin UIDs.

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /siteContent/{docId} {
         allow read: if true;
         allow write: if true; // tighten this once Firebase Auth is added
       }
     }
   }
   ============================================================ */
