// Constants configuration
class Config {
  static API_KEY = "f683e023bf660ce3e1ee4754606b0d91";
  static API_URL_CURRENT = "https://api.openweathermap.org/data/2.5/weather";
  static API_URL_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";
  static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
}

// Weather API Service
class WeatherAPI {
  async getCurrentWeather(city) {
    return this.fetchData(`${Config.API_URL_CURRENT}?q=${city}&appid=${Config.API_KEY}&units=metric`);
  }

  async getForecast(city) {
    return this.fetchData(`${Config.API_URL_FORECAST}?q=${city}&appid=${Config.API_KEY}&units=metric`);
  }

  async fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  }
}

// UI Manager
class UIManager {
  constructor() {
    this.cityInput = document.getElementById("cityInput");
    this.resultArea = document.getElementById("resultArea");
    this.fileInput = document.getElementById("fileInput");
  }

  showError(message) {
    alert(message);
  }

  updateResult(text) {
    this.resultArea.value = text;
  }

  getCityValue() {
    return this.cityInput.value;
  }

  clearInputs() {
    this.cityInput.value = "";
    this.resultArea.value = "";
    this.fileInput.value = "";
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      padding: "10px 20px",
      borderRadius: "5px",
      zIndex: "1000",
      backgroundColor: this.getNotificationColor(type),
      color: "white"
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.5s";
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  getNotificationColor(type) {
    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      info: "#2196F3"
    };
    return colors[type] || colors.info;
  }
}

// File Manager
class FileManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  saveToFile() {
    const content = this.uiManager.resultArea.value;
    if (!content) {
      this.uiManager.showNotification("Нет данных для сохранения.", "error");
      return;
    }

    const dataToSave = {
      content: content,
      timestamp: new Date().toISOString(),
      type: "weather-data",
      version: "1.0"
    };

    try {
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], {
        type: "application/json"
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = this.generateFileName();

      const saveBtn = document.getElementById("saveToFileBtn");
      saveBtn.textContent = "Сохранение...";
      saveBtn.disabled = true;

      setTimeout(() => {
        link.click();
        URL.revokeObjectURL(link.href);
        saveBtn.textContent = "Сохранить результат в файл";
        saveBtn.disabled = false;
        this.uiManager.showNotification("Файл успешно сохранен!", "success");
      }, 500);
    } catch (error) {
      console.error("Ошибка при сохранении файла:", error);
      this.uiManager.showNotification("Ошибка при сохранении файла", "error");
    }
  }

  generateFileName() {
    const date = new Date();
    return `weather_${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.json`;
  }

  async openFromFile(event) {
    const file = event.target.files[0];
    if (!this.validateFile(file)) return;

    try {
      const content = await this.readFile(file);
      this.processFileContent(content);
    } catch (error) {
      this.uiManager.showNotification("Ошибка при чтении файла", "error");
      console.error("Ошибка при чтении файла:", error);
    }
  }

  validateFile(file) {
    if (!file) {
      this.uiManager.showNotification("Файл не выбран", "error");
      return false;
    }

    if (file.size > Config.MAX_FILE_SIZE) {
      this.uiManager.showNotification("Файл слишком большой (максимум 5MB)", "error");
      return false;
    }

    if (!file.type.match("application/json") && !file.type.match("text/plain")) {
      this.uiManager.showNotification(
        "Неподдерживаемый формат файла. Используйте .json или .txt",
        "error"
      );
      return false;
    }

    return true;
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  processFileContent(content) {
    try {
      const data = JSON.parse(content);
      if (data.type === "weather-data" && data.content) {
        this.uiManager.updateResult(data.content);
        this.uiManager.showNotification(
          `Файл загружен (создан: ${new Date(data.timestamp).toLocaleString()})`,
          "success"
        );
      } else {
        this.uiManager.updateResult(content);
        this.uiManager.showNotification("Файл загружен", "success");
      }
    } catch (e) {
      this.uiManager.updateResult(content);
      this.uiManager.showNotification("Файл загружен как текст", "info");
    }
  }
}

// Weather App Main Class
class WeatherApp {
  constructor() {
    this.weatherAPI = new WeatherAPI();
    this.uiManager = new UIManager();
    this.fileManager = new FileManager(this.uiManager);
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.getElementById("currentWeatherBtn").addEventListener("click", () => this.getCurrentWeather());
    document.getElementById("forecastBtn").addEventListener("click", () => this.getWeatherForecast());
    document.getElementById("coordinatesBtn").addEventListener("click", () => this.getCityCoordinates());
    document.getElementById("saveToFileBtn").addEventListener("click", () => this.fileManager.saveToFile());
    document.getElementById("openFromFileBtn").addEventListener("click", () => {
      document.getElementById("fileInput").click();
    });
    document.getElementById("fileInput").addEventListener("change", (e) => this.fileManager.openFromFile(e));
    this.addCloseButton();
  }

  addCloseButton() {
    const closeButton = document.createElement("button");
    closeButton.id = "closeBtn";
    closeButton.textContent = "Close Connection";
    const textarea = document.getElementById("resultArea");
    textarea.parentNode.insertBefore(closeButton, textarea);
    closeButton.addEventListener("click", () => this.closeConnection());
  }

  async getCurrentWeather() {
    const city = this.uiManager.getCityValue();
    if (!city) {
      this.uiManager.showError("Please enter a city name.");
      return;
    }

    try {
      const data = await this.weatherAPI.getCurrentWeather(city);
      this.uiManager.updateResult(`Current temperature in ${data.name} is ${data.main.temp}°C`);
    } catch (error) {
      this.uiManager.updateResult("Error fetching weather data.");
    }
  }

  async getWeatherForecast() {
    const city = this.uiManager.getCityValue();
    if (!city) {
      this.uiManager.showError("Please enter a city name.");
      return;
    }

    try {
      const data = await this.weatherAPI.getForecast(city);
      let result = `Weather forecast for ${city}:\n`;
      data.list.slice(0, 5).forEach((item) => {
        result += `${item.dt_txt}: ${item.main.temp}°C\n`;
      });
      this.uiManager.updateResult(result);
    } catch (error) {
      this.uiManager.updateResult("Error fetching forecast data.");
    }
  }

  async getCityCoordinates() {
    const city = this.uiManager.getCityValue();
    if (!city) {
      this.uiManager.showError("Please enter a city name.");
      return;
    }

    try {
      const data = await this.weatherAPI.getCurrentWeather(city);
      this.uiManager.updateResult(
        `Coordinates of ${data.name}:\nLatitude: ${data.coord.lat}, Longitude: ${data.coord.lon}`
      );
    } catch (error) {
      this.uiManager.updateResult("Error fetching coordinates.");
    }
  }

  closeConnection() {
    this.uiManager.clearInputs();
    console.log("API connection closed");
    alert("Connection closed successfully");
  }
}

// Initialize the application
const weatherApp = new WeatherApp();