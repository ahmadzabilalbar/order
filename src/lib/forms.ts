import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a useActionState action without React's automatic form
 * reset, so inputs survive a validation error. Reset manually on success.
 */
export const keepValues = (action: (formData: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  startTransition(() => action(formData));
};
