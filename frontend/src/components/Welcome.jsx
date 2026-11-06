import { cardCls } from "../ui";

export default function Welcome() {
  return (
    <div className={`${cardCls} max-w-xl`}>
      <h2 className="mb-2 text-base font-semibold text-slate-900">Welcome</h2>
      <p className="text-sm text-slate-600">Clean magnetometer data in three steps:</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li><b>Upload</b> one or many files from any instrument.</li>
        <li><b>Clean</b>: pick an outlier method and a smoothing method, then Apply.</li>
        <li><b>Check</b> the plot and the run table, then export the result.</li>
      </ol>
    </div>
  );
}
