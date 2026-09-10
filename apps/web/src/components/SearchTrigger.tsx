type Props = {
  onClick: () => void;
};

export function SearchTrigger({ onClick }: Props) {
  return (
    <button
      type="button"
      className="top-bar-search"
      onClick={onClick}
      aria-label="Search"
      title="Search"
    >
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
