import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import {
  OFFICIAL_PHONE_LOCAL,
  OFFICIAL_CONTACT_EMAIL,
  resolveActiveOfficialPhone,
} from '../../constants/officialContact';
import {
  CloudContactSettings,
  DEFAULT_CLOUD_CONTACT_SETTINGS,
  CACHE_KEY_CONTACT,
} from './types';

export function useContactSettingsState(canAccessAdmin: boolean) {
  const [contactSettings, setContactSettings] = useState<CloudContactSettings>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CONTACT);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          whatsappReportsNumber: resolveActiveOfficialPhone(parsed.whatsappReportsNumber),
          contactPhone: resolveActiveOfficialPhone(parsed.contactPhone),
          contactEmail: OFFICIAL_CONTACT_EMAIL,
        };
      }
    } catch {}
    return DEFAULT_CLOUD_CONTACT_SETTINGS;
  });

  useEffect(() => {
    fetch('/api/settings/contact')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          const synced: CloudContactSettings = {
            whatsappReportsNumber: resolveActiveOfficialPhone(
              data.settings.whatsappReportsNumber
            ),
            contactPhone: resolveActiveOfficialPhone(data.settings.contactPhone),
            contactEmail: OFFICIAL_CONTACT_EMAIL,
          };
          setContactSettings(synced);
          try {
            localStorage.setItem(CACHE_KEY_CONTACT, JSON.stringify(synced));
          } catch {}
        }
      })
      .catch(() => {});

    const unsubContact = onSnapshot(
      doc(db, 'system_config', 'contact_settings'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Record<string, any>;
          const resolvedWa = resolveActiveOfficialPhone(d.whatsappReportsNumber);
          const resolvedPhone = resolveActiveOfficialPhone(d.contactPhone);
          const next: CloudContactSettings = {
            whatsappReportsNumber: resolvedWa,
            contactPhone: resolvedPhone,
            contactEmail: OFFICIAL_CONTACT_EMAIL,
          };
          setContactSettings(next);
          try {
            localStorage.setItem(CACHE_KEY_CONTACT, JSON.stringify(next));
          } catch {}

          if (
            d.contactEmail !== OFFICIAL_CONTACT_EMAIL ||
            d.whatsappReportsNumber !== resolvedWa ||
            d.contactPhone !== resolvedPhone
          ) {
            if (auth.currentUser) {
              setDoc(
                doc(db, 'system_config', 'contact_settings'),
                {
                  contactEmail: OFFICIAL_CONTACT_EMAIL,
                  whatsappReportsNumber: resolvedWa,
                  contactPhone: resolvedPhone,
                },
                { merge: true }
              ).catch(() => {});
            }
          }
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

      const nextSettings: CloudContactSettings = {
        whatsappReportsNumber:
          String(input.whatsappReportsNumber || '').trim() || OFFICIAL_PHONE_LOCAL,
        contactPhone: String(input.contactPhone || '').trim() || OFFICIAL_PHONE_LOCAL,
        contactEmail: OFFICIAL_CONTACT_EMAIL,
      };

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/settings/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(nextSettings),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ الإعدادات.');
      }

      setContactSettings(nextSettings);
      try {
        localStorage.setItem(CACHE_KEY_CONTACT, JSON.stringify(nextSettings));
      } catch {}

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
