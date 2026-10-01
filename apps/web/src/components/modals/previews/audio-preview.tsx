import { CustomAudioPlayer } from "@/components/audio/custom-audio-player";

interface AudioPreviewProps {
  src: string;
}

export function AudioPreview({ src }: AudioPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-surface-2 px-4 py-8">
      <CustomAudioPlayer src={src} />
    </div>
  );
}
