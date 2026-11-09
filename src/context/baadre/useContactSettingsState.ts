import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth, withAppCheckHeaders } from '../../lib/firebase';
import {
  CloudContactSettings,
  DEFAULT_CLOUD_CONTACT_SETTINGS,
  CACHE_KEY_CONTACT,
} from './types';

export function useContactSettingsState(canAccessAdmin: boolean) {
  const [contactSettings, setContactSettings] = useState<CloudContactSettings>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_CONTACT);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.contactEmail) return parsed;
      }
    } catch {}
    return DEFAULT_CLOUD_CONTACT_SETTINGS;
  });

  useEffect(() => {
    withAppCheckHeaders().then((headers) =>
      fetch('/api/settings/contact', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.settings) {
            setContactSettings({
              whatsappReportsNumber: '9647749019911',
              contactPhone: '9647749019911',
              contactEmail:
                String(data.settings.contactEmail || '').trim() ||
                DEFAULT_CLOUD_CONTACT_SETTINGS.contactEmail,
            });
          }
        })
        .catch(() => {})
    );

    const unsubContact = onSnapshot(
      doc(db, 'system_config', 'contact_settings'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Record<string, any>;
          const updatedContact: CloudContactSettings = {
            whatsappReportsNumber: '9647749019911',
            contactPhone: '9647749019911',
            contactEmail:
              String(d.contactEmail || '').trim() ||
              DEFAULT_CLOUD_CONTACT_SETTINGS.contactEmail,
          };
          setContactSettings((prev) => {
            if (prev.contactEmail === updatedContact.contactEmail) return prev;
            try {
              localStorage.setItem(CACHE_KEY_CONTACT, JSON.stringify(updatedContact));
            } catch {}
            return updatedContact;
          });
        }
      },
      () => {}
    );

    return () => unsubContact();
  }, []);

  const updateContactSettings = useCallback(
    async (input: CloudContactSettings) => {
      if (!canAccessAdmin) {
        throw new Error('غير مصرح: هذه الصلاحية مخصصة لإدارة المنظمة فقط.');
      }
      const fixedNumber = '9647749019911';
      const cleanEmail = String(input.contactEmail || '').trim();

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error('البريد الإلكتروني غير صالح.');
      }

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/settings/contact', {
        method: 'POST',
        headers: await withAppCheckHeaders({
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        body: JSON.stringify({
          whatsappReportsNumber: fixedNumber,
          contactPhone: fixedNumber,
          contactEmail: cleanEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ الإعدادات.');
      }

      const nextSettings: CloudContactSettings = {
        whatsappReportsNumber: fixedNumber,
        contactPhone: fixedNumber,
        contactEmail: cleanEmail,
      };

      setContactSettings(nextSettings);

      try {
        await setDoc(
          doc(db, 'system_config', 'contact_settings'),
          {
            id: 'contact_settings',
            ...nextSettings,
            updatedBy: auth.currentUser?.uid || 'admin',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    },
    [canAccessAdmin]
  );

  return {
    contactSettings,
    updateContactSettings,
  };
}
