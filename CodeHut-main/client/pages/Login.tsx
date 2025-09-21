import { useState } from "react";
import AuthForm from "@/components/auth/AuthForm";

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AuthForm initialMode="login" />
      </div>
    </div>
  );
}
