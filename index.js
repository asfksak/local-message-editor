import { createPlugin } from "@enmity/core";
import { getModule } from "@enmity/metro";
import { after } from "@enmity/patcher";
import { storage } from "@enmity/storage";
import { openAlert } from "@enmity/ui";

const TARGET_USER_ID = "1272645405951266869";

export default createPlugin({
  name: "Local Message Editor",
  description: "Locally edit messages from a specific user (client-side only)",
  authors: ["yourname"],

  onStart() {
    this.edits = storage.get("local-edits", {});

    const MessageContent = getModule(
      m => m?.type?.displayName === "MessageContent"
    );

    if (MessageContent) {
      this.unpatchRender = after("type", MessageContent, (args) => {
        const props = args?.[0];
        const message = props?.message;
        if (!message) return;

        if (message.author?.id !== TARGET_USER_ID) return;

        const edited = this.edits[message.id];
        if (edited) message.content = edited;
      });
    }

    const MessageContextMenu = getModule(
      m => m?.default?.displayName === "MessageContextMenu"
    );

    if (MessageContextMenu) {
      this.unpatchMenu = after("default", MessageContextMenu, (args, res) => {
        const message = args?.[0]?.message;
        if (!message) return res;
        if (message.author?.id !== TARGET_USER_ID) return res;

        const items = res.props?.children;
        if (!Array.isArray(items)) return res;

        items.push({
          label: "Edit locally",
          onPress: () => {
            openAlert({
              title: "Edit message locally",
              body: "Only visible to you",
              confirmText: "Save",
              cancelText: "Cancel",
              withInput: {
                value: this.edits[message.id] ?? message.content,
                placeholder: "New message text"
              },
              onConfirm: (text) => {
                if (typeof text === "string") {
                  this.edits[message.id] = text;
                  storage.set("local-edits", this.edits);
                }
              }
            });
          }
        });

        return res;
      });
    }
  },

  onStop() {
    this.unpatchRender?.();
    this.unpatchMenu?.();
  }
});
