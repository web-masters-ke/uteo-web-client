interface Props { title: string; description?: string; icon?: React.ReactNode; action?: { label: string; onClick: () => void }; }
export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"><svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg></div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>}
      {action && <button onClick={action.onClick} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600">{action.label}</button>}
    </div>
  );
}
