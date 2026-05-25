console.log("App loaded");

document.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loadingScreen");

  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 800);
  }
});