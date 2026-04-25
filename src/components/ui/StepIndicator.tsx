export default function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${i < currentStep ? 'bg-primary-500 text-white' : i === currentStep ? 'bg-primary-500 text-white ring-4 ring-primary-100 dark:ring-primary-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              {i < currentStep ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : i + 1}
            </div>
            <span className={`mt-2 text-xs font-medium hidden sm:block ${i <= currentStep ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>{step}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-12 sm:w-20 h-0.5 mx-2 ${i < currentStep ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
        </div>
      ))}
    </div>
  );
}
