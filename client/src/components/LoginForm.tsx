import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRPCClientError } from "@trpc/client";
import { useState } from "react";

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof TRPCClientError) return error.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

export default function LoginForm() {
  const { login, loginError, loginPending, register, registerError, registerPending } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const pending = mode === "login" ? loginPending : registerPending;
  const error = errorMessage(mode === "login" ? loginError : registerError);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login({ username, password });
    } else {
      register({ username, password, name: name.trim() || undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4 text-left">
      {mode === "register" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">이름</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="username">아이디</Label>
        <Input
          id="username"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-[#214e3b] hover:bg-[#173a2b]">
        {mode === "login" ? "로그인" : "가입하고 시작하기"}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="w-full text-center text-sm text-stone-500 hover:text-stone-700"
      >
        {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
      </button>
    </form>
  );
}
