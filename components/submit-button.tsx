"use client";

import {useFormStatus} from "react-dom";
import type {ButtonHTMLAttributes,ReactNode} from "react";

type Props=ButtonHTMLAttributes<HTMLButtonElement>&{
  pendingText?:string;
  children:ReactNode;
};

export function SubmitButton({
  pendingText="A processar…",
  children,
  disabled,
  ...props
}:Props){
  const {pending}=useFormStatus();
  return <button {...props} type={props.type??"submit"} disabled={disabled||pending} aria-busy={pending}>
    {pending?pendingText:children}
  </button>;
}
