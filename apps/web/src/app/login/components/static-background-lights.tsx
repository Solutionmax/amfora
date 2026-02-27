export const StaticBackgroundLights = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_70%)] dark:opacity-70 opacity-30" />
      <div className="absolute -bottom-[20%] -right-[20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_70%)] dark:opacity-70 opacity-30" />
    </div>
  );
};
