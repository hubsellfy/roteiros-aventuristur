import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n';

export default function CreateTripView({
  onBack,
  children,
}: {
  onBack: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const { t } = useTranslation();
  const dirty = useRef(false);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  return (
    <main
      onChangeCapture={() => {
        dirty.current = true;
      }}
      className="mx-auto w-full max-w-3xl px-4 pb-32 pt-8 text-content"
    >
      <button
        type="button"
        onClick={() => {
          if (!dirty.current || window.confirm(t('common.unsavedMessage'))) onBack();
        }}
        className="mb-6 rounded-full border border-edge bg-surface-card px-5 py-3 text-body font-semibold text-content"
      >
        ← {t('common.back')}
      </button>
      {children}
    </main>
  );
}
