import { useMemo } from "react";
import { IconDownload, IconInbox } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { FileTypeIcon } from "@/components/files/file-type-icon";
import { isScanBlocked, ScanLine } from "@/components/files/scan-status";
import { useAddedLabel } from "@/components/files/use-added-label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LineList, LineRow } from "@/components/ui/line-list";
import { downloadReverseShareFile } from "@/http/endpoints/reverse-shares";
import type { ReverseShareFile, ReverseShareWithAlias } from "@/http/endpoints/reverse-shares/types";
import { formatFileSize } from "@/utils/format-file-size";
import { SectionHeading } from "./section-heading";

const SHOWN = 3;

type ReceivedFile = ReverseShareFile & { linkName: string };

/** Newest files across all receive links. */
export function latestReceived(links: ReverseShareWithAlias[], untitled: string, count = SHOWN): ReceivedFile[] {
  return links
    .flatMap((link) => (link.files || []).map((file) => ({ ...file, linkName: link.name || untitled })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, count);
}

export function JustReceived({ links }: { links: ReverseShareWithAlias[] | null }) {
  const t = useTranslations();
  const added = useAddedLabel();
  const files = useMemo(() => latestReceived(links || [], t("dashboard.calm.untitledLink")), [links, t]);

  if (links === null) return null;

  const download = async (file: ReceivedFile) => {
    try {
      const response = await downloadReverseShareFile(file.id);
      const link = document.createElement("a");
      link.href = response.data.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("reverseShares.modals.details.downloadError"));
    }
  };

  return (
    <section aria-labelledby="just-received">
      <SectionHeading
        title={<span id="just-received">{t("dashboard.calm.justReceived")}</span>}
        href="/reverse-shares"
        linkLabel={t("dashboard.calm.allReceiveLinks")}
      />
      {files.length === 0 ? (
        <EmptyState
          className="border-t border-line py-10"
          icon={<IconInbox />}
          title={t("dashboard.calm.nothingReceived")}
          description={t("dashboard.calm.nothingReceivedHint")}
        />
      ) : (
        <LineList top>
          {files.map((file) => {
            const sender = file.uploaderName || file.uploaderEmail || t("reverseShares.components.fileRow.anonymous");
            return (
              <LineRow
                key={file.id}
                icon={<FileTypeIcon name={file.name} />}
                title={file.name}
                sub={
                  <>
                    <span className="block truncate">
                      {t("dashboard.calm.receivedMeta", { sender, link: file.linkName, when: added(file.createdAt) })}
                    </span>
                    <ScanLine file={file} />
                  </>
                }
              >
                <span className="text-[13px] text-ink-2 max-sm:hidden">{formatFileSize(Number(file.size))}</span>
                {!isScanBlocked(file) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("files.calm.downloadItem", { name: file.name })}
                    onClick={() => download(file)}
                  >
                    <IconDownload />
                  </Button>
                )}
              </LineRow>
            );
          })}
        </LineList>
      )}
    </section>
  );
}
