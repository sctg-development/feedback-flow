import { CopyButton } from "@/components/copy-button";
import { EditIcon } from "@heroui/shared-icons";
import { AuthenticationGuardWithPermission } from "@/components/auth0";

interface PurchaseIdCellProps {
  purchaseId: string;
  hasPublication: boolean;
  onEditPurchase: (purchaseId: string) => void;
  onGenerateLink: (purchaseId: string) => void;
}

/**
 * Component for rendering the purchase ID cell with copy button, edit button, and link generation
 */
export const PurchaseIdCell = ({
  purchaseId,
  hasPublication,
  onEditPurchase,
  onGenerateLink,
}: PurchaseIdCellProps) => {
  const canGenerateLink = hasPublication;

  return (
    <>
      <div className="flex items-center">
        <div
          className={canGenerateLink ? "cursor-pointer hover:underline text-blue-500" : ""}
          onClick={() => {
            if (canGenerateLink) {
              onGenerateLink(purchaseId);
            }
          }}
        >
          {purchaseId}
        </div>
        <div className="flex flex-col">
          <CopyButton value={purchaseId} />
          <AuthenticationGuardWithPermission permission={import.meta.env.ADMIN_PERMISSION}>
            <EditIcon
              onClick={() => onEditPurchase(purchaseId)}
              className="group inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal subpixel-antialiased overflow-hidden tap-highlight-transparent transform-gpu data-[pressed=true]:scale-[0.97] cursor-pointer outline-hidden data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-tiny rounded-small px-0 transition-transform-colors-opacity motion-reduce:transition-none bg-transparent data-[hover=true]:bg-default/40 min-w-4 w-4 h-4 relative z-50 text-zinc-300 bottom-0 left-2"
            />
          </AuthenticationGuardWithPermission>
        </div>
      </div>
    </>
  );
};