'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

/** 
 * Initiate anonymous sign-in (non-blocking). 
 */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    toast({
      variant: "destructive",
      title: "Sign-in Failed",
      description: error.message || "An unexpected error occurred during anonymous sign-in.",
    });
  });
}

/** 
 * Initiate email/password sign-up (non-blocking). 
 */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((error) => {
    toast({
      variant: "destructive",
      title: "Registration Failed",
      description: error.message || "Could not create your account. Please check your details.",
    });
  });
}

/** 
 * Initiate email/password sign-in (non-blocking). 
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch((error) => {
    let message = error.message;
    if (error.code === 'auth/invalid-credential') {
      message = "Invalid email or password. Please try again.";
    }
    toast({
      variant: "destructive",
      title: "Login Failed",
      description: message,
    });
  });
}
