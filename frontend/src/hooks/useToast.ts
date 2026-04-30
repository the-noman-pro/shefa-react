import type { Toast } from 'primereact/toast';

let globalToastRef: React.RefObject<Toast | null> | null = null;

export function setGlobalToastRef(ref: React.RefObject<Toast | null>) {
  globalToastRef = ref;
}

export function useToast() {
  const show = (options: {
    severity: 'success' | 'error' | 'info' | 'warn';
    summary?: string;
    detail: string;
    life?: number;
  }) => {
    globalToastRef?.current?.show({
      severity: options.severity,
      summary: options.summary || options.severity.charAt(0).toUpperCase() + options.severity.slice(1),
      detail: options.detail,
      life: options.life || 3000,
    });
  };

  return {
    success: (detail: string) => show({ severity: 'success', detail }),
    error: (detail: string) => show({ severity: 'error', detail }),
    info: (detail: string) => show({ severity: 'info', detail }),
    warn: (detail: string) => show({ severity: 'warn', detail }),
  };
}