import { ReverseShare } from "../hooks/use-reverse-shares";
import { EmptyReverseSharesState } from "./empty-reverse-shares-state";
import { ReverseShareRow, type ReverseShareRowProps } from "./reverse-share-row";

type Props = Omit<ReverseShareRowProps, "reverseShare"> & {
  reverseShares: ReverseShare[];
  onCreateReverseShare: () => void;
};

export function ReverseSharesCardsContainer({ reverseShares, onCreateReverseShare, ...rowProps }: Props) {
  if (reverseShares.length === 0) {
    return <EmptyReverseSharesState onCreateReverseShare={onCreateReverseShare} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {reverseShares.map((reverseShare) => (
        <ReverseShareRow key={reverseShare.id} reverseShare={reverseShare} {...rowProps} />
      ))}
    </div>
  );
}
