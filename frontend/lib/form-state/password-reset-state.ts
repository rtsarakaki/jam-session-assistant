export type ForgotPasswordState = {
  error: string | null;
  success: boolean;
};

export const forgotPasswordInitialState: ForgotPasswordState = {
  error: null,
  success: false,
};

export type ResetPasswordState = {
  error: string | null;
  success: boolean;
};

export const resetPasswordInitialState: ResetPasswordState = {
  error: null,
  success: false,
};
