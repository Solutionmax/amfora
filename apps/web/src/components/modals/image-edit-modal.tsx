"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconRotateClockwise, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import ReactCrop, { centerCrop, Crop, makeAspectCrop, PixelCrop } from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImageFile: File) => void;
  imageFile: File | null;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageEditModal({ isOpen, onClose, onSave, imageFile }: ImageEditModalProps) {
  const t = useTranslations();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const aspect = 1;
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imageFile) {
      setIsImageLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setIsImageLoading(false);
      };
      reader.onerror = () => {
        setIsImageLoading(false);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (aspect) {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspect));
      }
    },
    [aspect]
  );

  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
  };

  const getCroppedImage = useCallback(async (): Promise<File | null> => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    const rotateRads = rotate * (Math.PI / 180);
    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.rotate(rotateRads);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(image, 0, 0);

    ctx.restore();

    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "cropped-image.png", { type: "image/png" });
            resolve(file);
          }
        },
        "image/png",
        1
      );
    });
  }, [completedCrop, scale, rotate]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const croppedImageFile = await getCroppedImage();
      if (croppedImageFile) {
        onSave(croppedImageFile);
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setImageSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setRotate(0);
    setIsImageLoading(false);
    onClose();
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-3">
      <Button variant="outline" size="sm" onClick={handleRotate} disabled={isLoading}>
        <IconRotateClockwise />
        {t("imageEdit.rotate")}
      </Button>
      <div className="flex min-w-[220px] flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("files.calm.zoomOut")}
          onClick={handleZoomOut}
          disabled={isLoading || scale <= 0.5}
        >
          <IconZoomOut />
        </Button>
        <Slider
          value={[scale]}
          onValueChange={handleScaleChange}
          max={3}
          min={0.5}
          step={0.1}
          className="flex-1"
          aria-label={t("imageEdit.zoom")}
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("files.calm.zoomIn")}
          onClick={handleZoomIn}
          disabled={isLoading || scale >= 3}
        >
          <IconZoomIn />
        </Button>
        <span className="w-11 text-right text-[12.5px] tabular-nums text-ink-3">{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex h-fit flex-col overflow-hidden sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t("imageEdit.title")}</DialogTitle>
          <DialogDescription>{t("imageEdit.cropInstructions")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isImageLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="mx-auto aspect-square w-full max-w-[400px] rounded-xl" />
            </div>
          ) : imageSrc ? (
            <div className="grid gap-4">
              {toolbar}
              <div className="flex justify-center rounded-xl bg-surface-2 p-2">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  minWidth={100}
                  minHeight={100}
                  keepSelection
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    alt={t("imageEdit.title")}
                    src={imageSrc}
                    style={{
                      transform: `scale(${scale}) rotate(${rotate}deg)`,
                      maxWidth: "100%",
                      maxHeight: "400px",
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !completedCrop}>
            {isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>

        {/* Hidden canvas for generating the cropped image */}
        <canvas ref={previewCanvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
