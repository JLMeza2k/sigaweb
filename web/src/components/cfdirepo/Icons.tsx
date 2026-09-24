// ── Icons (react-icons / Heroicons 2) ──────────────────────────────────

import {
  HiOutlineArrowPath,
  HiCheck,
  HiOutlineTrash,
  HiOutlineArrowDownTray,
  HiOutlineXMark,
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineTableCells,
  HiOutlineArrowUpTray,
} from "react-icons/hi2";

type IconProps = { className?: string };

export function IconSpinner({ className = "" }: IconProps) {
  return <HiOutlineArrowPath className={`animate-spin ${className}`} />;
}

export function IconRefresh({ className = "" }: IconProps) {
  return <HiOutlineArrowPath className={className} />;
}

export function IconCheck({ className = "" }: IconProps) {
  return <HiCheck className={className} />;
}

export function IconTrash({ className = "" }: IconProps) {
  return <HiOutlineTrash className={className} />;
}

export function IconDownload({ className = "" }: IconProps) {
  return <HiOutlineArrowDownTray className={className} />;
}

export function IconClose({ className = "" }: IconProps) {
  return <HiOutlineXMark className={className} />;
}

export function IconShield({ className = "" }: IconProps) {
  return <HiOutlineShieldCheck className={className} />;
}

export function IconSearch({ className = "" }: IconProps) {
  return <HiOutlineMagnifyingGlass className={className} />;
}

export function IconArrowLeft({ className = "" }: IconProps) {
  return <HiOutlineArrowLeft className={className} />;
}

export function IconArrowRight({ className = "" }: IconProps) {
  return <HiOutlineArrowRight className={className} />;
}

export function IconTable({ className = "" }: IconProps) {
  return <HiOutlineTableCells className={className} />;
}

export function IconUpload({ className = "" }: IconProps) {
  return <HiOutlineArrowUpTray className={className} />;
}
