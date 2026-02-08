export const ChatImage = () => {
  return (
    <figure className="box-border caret-transparent flex justify-center p-4 rounded-xl">
      <img
        alt="Example AI chat preview"
        src="https://picsum.photos/id/1025/800/500"
        className="text-transparent aspect-[auto_800_/_500] box-border max-w-full w-[800px] rounded-lg"
      />
    </figure>
  );
};
