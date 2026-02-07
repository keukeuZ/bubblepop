import { useEffect } from 'react';

/**
 * Hook to show toast notifications for transaction success/error states.
 * Replaces the repeated useEffect pattern in JackpotCard.
 *
 * @param {object} tx - Transaction object with { isConfirmed, error, reset }
 * @param {object} toast - Toast context with { success, error }
 * @param {object} options
 * @param {string} options.successMessage - Message on success
 * @param {string} options.errorPrefix - Prefix for error message
 * @param {function} [options.onSuccess] - Callback on success (after toast)
 */
export function useTransactionToast(tx, toast, { successMessage, errorPrefix, onSuccess }) {
  useEffect(() => {
    if (tx.isConfirmed) {
      toast.success(successMessage);
      if (onSuccess) onSuccess();
      tx.reset();
    }
  }, [tx.isConfirmed]);

  useEffect(() => {
    if (tx.error) {
      toast.error(`${errorPrefix}: ${tx.error.shortMessage || 'Unknown error'}`);
      tx.reset();
    }
  }, [tx.error]);
}
