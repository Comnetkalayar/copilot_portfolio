console.log("App loaded");

// wait DOM
document.addEventListener("DOMContentLoaded", () => {
  // hide loading screen safely
  const loading = document.getElementById("loadingScreen");

  if (loading) {
    loading.style.display = "none";
  }

  // test if JS is running
  document.body.style.opacity = "1";
});