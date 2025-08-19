const ProgressStepper = ({ currentStep, steps }) => {
  const getCurrentStepIndex = () => {
    if (!currentStep) return -1;
    return steps.findIndex(step => step.key === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  // Check if current step is conception or travail graphique
  const isSpecialStep = (stepKey) => {
    return stepKey === 'conception' || stepKey === 'travail graphique';
  };

  const shouldShowSingleStep = currentStep && isSpecialStep(currentStep);

  const getStepStatus = (index) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200 scale-105',
          line: 'bg-gradient-to-r from-green-400 to-emerald-500',
          text: 'text-green-700 font-semibold',
          icon: true,
          pulse: false
        };
      case 'current':
        return {
          circle: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-300 scale-110 ring-4 ring-blue-100',
          line: 'bg-gray-200',
          text: 'text-blue-600 font-bold',
          icon: false,
          pulse: true
        };
      default:
        return {
          circle: 'bg-white text-gray-400 border-2 border-gray-300 shadow-sm hover:border-gray-400 hover:shadow-md',
          line: 'bg-gray-200',
          text: 'text-gray-500 hover:text-gray-700',
          icon: false,
          pulse: false
        };
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-gray-200 px-8 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-200/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100/20 to-green-200/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="relative">
        <div className="mb-6 text-center">
          <h4 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            Suivi des étapes de production
          </h4>
          <p className="text-gray-600 font-medium">
            Progression de la commande dans le processus de fabrication
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-8 max-w-2xl mx-auto">
          {shouldShowSingleStep ? (
            // Show only the current special step (conception or travail graphique)
            <div className="flex flex-col items-center group cursor-default">
              {/* Step Circle */}
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 transform bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-300 scale-110 ring-4 ring-blue-100 animate-pulse">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                
                <svg className="w-7 h-7 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              
              {/* Step Label */}
              <div className="mt-4 text-center">
                <p className="text-lg font-bold text-blue-600 capitalize">
                  {steps.find(step => step.key === currentStep)?.label || currentStep}
                </p>
                <div className="mt-2 w-2 h-2 bg-blue-500 rounded-full mx-auto animate-bounce"></div>
                <p className="text-sm text-gray-600 mt-2">Étape en cours</p>
              </div>
            </div>
          ) : (
            // Show normal progress stepper for other steps
            steps.map((step, index) => {
              const status = getStepStatus(index);
              const classes = getStepClasses(status);
              const isLast = index === steps.length - 1;

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center group cursor-default">
                    {/* Step Circle */}
                    <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 transform hover:scale-105 ${classes.circle} ${classes.pulse ? 'animate-pulse' : ''}`}>
                      {/* Glow effect for current step */}
                      {status === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                      )}
                      
                      {classes.icon ? (
                        <svg className="w-6 h-6 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-lg font-bold drop-shadow-sm">{index + 1}</span>
                      )}
                      
                      {/* Status indicator dot */}
                      {status === 'completed' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>
                    
                    {/* Step Label */}
                    <div className="mt-3 text-center max-w-20">
                      <p className={`text-sm font-medium capitalize transition-all duration-300 group-hover:scale-105 ${classes.text}`}>
                        {step.label}
                      </p>
                      {status === 'current' && (
                        <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full mx-auto animate-bounce"></div>
                      )}
                    </div>
                  </div>
                  
                  {/* Connecting Line */}
                  {!isLast && (
                    <div className="w-20 mx-4 relative">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${classes.line}`}
                             style={{ 
                               width: status === 'completed' ? '100%' : 
                                     status === 'current' ? '50%' : '0%' 
                             }}>
                        </div>
                      </div>
                      {/* Progress dots */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className={`w-1 h-1 rounded-full transition-all duration-500 ${
                          status === 'completed' ? 'bg-green-400' : 
                          status === 'current' ? 'bg-blue-400 animate-pulse' : 'bg-gray-300'
                        }`}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Progress percentage */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {shouldShowSingleStep ? (
                `Étape active: ${steps.find(step => step.key === currentStep)?.label || currentStep}`
              ) : (
                `Progression: ${currentStepIndex >= 0 ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0}%`
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProgressStepper;