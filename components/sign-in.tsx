"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Sign-in screen. There is no authentication behind it — either button enters
 * the workspace, exactly as in the prototype. The Microsoft option is shown
 * because the product is intended to sit alongside Microsoft 365 and Outlook.
 */
export function SignIn({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState("brendan.chapman@finsure-demo.example");
  const [password, setPassword] = useState("............");

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      style={{ background: "var(--gradient-sign-in)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <form
          className="w-[380px] px-6 text-center"
          onSubmit={(e) => {
            e.preventDefault();
            onSignIn();
          }}
        >
          <Image
            src="/assets/finsure-logo.png"
            alt="Finsure Loans"
            width={220}
            height={110}
            priority
            className="mx-auto mb-10 block h-auto w-[220px]"
          />

          <h1 className="m-0 mb-1.5 text-[28px] font-medium">
            Mortgage Intelligence
          </h1>
          <p className="m-0 mb-[30px] text-sm text-secondary">
            Sign in to the Finsure network workspace.
          </p>

          <label className="sr-only" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-card border border-hairline bg-surface px-[15px] py-[13px] text-sm"
          />

          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-5 w-full rounded-card border border-hairline bg-surface px-[15px] py-[13px] text-sm"
          />

          <button
            type="submit"
            className="w-full cursor-pointer rounded-card border-0 bg-white p-3.5 text-sm font-semibold text-inset"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={onSignIn}
            className="mt-3 w-full cursor-pointer rounded-card border border-hairline bg-transparent p-[13px] text-[13.5px] font-medium text-primary"
          >
            Continue with Microsoft 365
          </button>

          <p className="mt-[26px] mb-0 text-meta leading-relaxed text-secondary">
            Prototype. Works alongside Infynity, Microsoft 365 &amp; Outlook.
          </p>
        </form>
      </div>
    </div>
  );
}
