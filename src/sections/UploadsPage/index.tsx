import { useEffect, useState } from "react";
import { CreateSidebar } from "@/sections/CreatePage/components/Sidebar";

type UploadItem = {
  id: string;
  name: string;
  type: string;
  url: string; // object URL
};

export const UploadsPage = () => {
  const [items, setItems] = useState<UploadItem[]>([]);

  useEffect(() => {
    return () => {
      // Revoke object URLs on unmount
      items.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, [items]);

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setItems((prev) => [...newItems, ...prev]);
    e.target.value = "";
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearAll = () => {
    setItems((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
  };

  return (
    <main className="text-white box-border caret-transparent min-h-screen pt-20">
      <CreateSidebar />
      <section className="pl-60 pr-4">
        <div className="box-border caret-transparent max-w-none w-full mx-auto md:max-w-screen-xl">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-semibold">Uploads</h1>
            <div className="flex items-center gap-2">
              <button onClick={clearAll} className="h-8 px-3 rounded-full bg-zinc-800 border border-zinc-700">Clear All</button>
            </div>
          </div>
          <div className="box-border caret-transparent mb-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 cursor-pointer">
              <span className="text-sm">Upload Images/Videos</span>
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFilesSelected} />
            </label>
            <p className="text-zinc-400 text-xs mt-2">Files are previewed locally in your browser for this session.</p>
          </div>

          {items.length === 0 ? (
            <div className="text-zinc-400 text-sm py-16 text-center border border-dashed border-zinc-700 rounded-md">
              No uploads yet — add some media to see previews here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="relative rounded-md overflow-hidden bg-zinc-900 border border-zinc-700">
                  {item.type.startsWith("image/") ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <video controls playsInline src={item.url} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute left-0 right-0 bottom-0 bg-black/50 px-2 py-1 flex items-center justify-between">
                    <span className="text-xs truncate">{item.name}</span>
                    <button onClick={() => removeItem(item.id)} className="text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};