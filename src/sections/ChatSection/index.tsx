import { ChatImage } from "@/sections/ChatSection/components/ChatImage";
import { ChatContent } from "@/sections/ChatSection/components/ChatContent";

export const ChatSection = () => {
  return (
    <section className="box-border caret-transparent my-6">
      <div className="box-border caret-transparent w-auto mb-16 mx-auto md:w-[66.6667%]">
        <ChatImage />
        <ChatContent />
      </div>
    </section>
  );
};
