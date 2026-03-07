const logMessage = (type: "log" | "error", message: unknown) => {
  if (typeof message !== "string" || !message.trim()) {
    return;
  }

  if (type === "error") {
    console.error(message);
    return;
  }

  console.log(message);
};

type ToastCallable = ((message?: string) => string) & {
  success: (message?: string) => string;
  error: (message?: string) => string;
  loading: (message?: string) => string;
  dismiss: () => void;
  remove: () => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading?: string;
      success?: string | ((value: T) => string);
      error?: string | ((error: unknown) => string);
    }
  ) => Promise<T>;
};

const toast = ((message?: string) => {
  logMessage("log", message);
  return "";
}) as ToastCallable;

toast.success = (message?: string) => {
  logMessage("log", message);
  return "";
};

toast.error = (message?: string) => {
  logMessage("error", message);
  return "";
};

toast.loading = (message?: string) => {
  logMessage("log", message);
  return "";
};

toast.dismiss = () => { };
toast.remove = () => { };

toast.promise = async (promise, messages) => {
  if (messages?.loading) {
    toast.loading(messages.loading);
  }

  try {
    const result = await promise;
    if (messages?.success) {
      toast.success(
        typeof messages.success === "function" ? messages.success(result) : messages.success
      );
    }
    return result;
  } catch (error) {
    if (messages?.error) {
      toast.error(typeof messages.error === "function" ? messages.error(error) : messages.error);
    }
    throw error;
  }
};

export const Toaster = () => null;

export default toast;

