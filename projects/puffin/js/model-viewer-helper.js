// Handle loading of models by clicking button
document.querySelectorAll('model-viewer .btn-load').forEach((button) => {
  button.addEventListener('click', () => {
      const parentModelViewer = button.closest('model-viewer'); // Ensure the button is inside a model-viewer
      if (parentModelViewer) {
          parentModelViewer.dismissPoster(); // Call dismissPoster on the parent model-viewer
          button.style.display = 'none'; // Hide the button
      }
  });
});

// Once website loaded, start loading the models anyway
window.onload = () => {
  // Get all model-viewer elements
  const modelViewers = Array.from(document.querySelectorAll('model-viewer'));
  
  // Helper function to load models one by one
  const loadModelsSequentially = async (index) => {
      if (index >= modelViewers.length) return; // Stop when all models are loaded
      
      const currentModelViewer = modelViewers[index];
      if (currentModelViewer) {
          // Find the button inside the current model-viewer
          const button = currentModelViewer.querySelector('.btn-load');
          
          if (button) {
              // Hide the button
              button.style.display = 'none';
          }

          // Wait for the current model to finish loading
          currentModelViewer.addEventListener('load', () => {
              console.log(`Model ${index + 1} loaded`);
              loadModelsSequentially(index + 1); // Load the next model
          }, { once: true }); // Ensure the event fires only once
          
          // Call dismissPoster to start loading
          currentModelViewer.dismissPoster();
      }
  };

  // Start loading the first model
  loadModelsSequentially(0);
};
