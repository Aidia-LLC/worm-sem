import { createEffect, createUniqueId, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

export const Modal = (props: {
  show: boolean;
  children: JSX.Element;
  onClose: () => void;
  mount?: HTMLElement;
}) => {
  const id = createUniqueId();
  let dialogRef!: HTMLDialogElement;

  createEffect(() => {
    if (props.show) {
      dialogRef.show();
    } else {
      dialogRef.close();
    }
  });
  return (
    <Portal mount={props.mount}>
      <dialog ref={dialogRef} id={id} class="modal">
        <div class="modal-box">{props.children}</div>
        <form method="dialog" class="modal-backdrop bg-black/25">
          <button onClick={props.onClose}>close</button>
        </form>
      </dialog>
    </Portal>
  );
};
