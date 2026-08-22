export default function ComingSoon({ title, icon = "construction" }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant">
      <span className="material-symbols-outlined text-primary text-[48px] mb-4">{icon}</span>
      <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">{title}</h2>
      <p className="text-on-surface-variant max-w-md">
        This module is being developed by another team member and isn't part of this build.
      </p>
    </div>
  );
}
