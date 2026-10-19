// Display only; the backend enforces every permission independently.
export const isTrainingSession = () => process.env.REACT_APP_CERTSYNC_TRAINING_ENABLED === 'true'
  && localStorage.getItem('certsyncTraining') === 'true';
