// Класс для хранения конфигурационных констант приложения
class Config {
  // API ключ для доступа к сервису OpenWeatherMap
  static API_KEY = "f683e023bf660ce3e1ee4754606b0d91";
  // Базовый URL для получения текущей погоды
  static API_URL_CURRENT = "https://api.openweathermap.org/data/2.5/weather";
  // Базовый URL для получения прогноза погоды
  static API_URL_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";
  // Максимальный размер загружаемого файла (5MB)
  static MAX_FILE_SIZE = 5 * 1024 * 1024;
}

// Класс для работы с API погоды
class WeatherAPI {
  // Метод для получения текущей погоды по названию города
  async getCurrentWeather(city) {
    return this.fetchData(`${Config.API_URL_CURRENT}?q=${city}&appid=${Config.API_KEY}&units=metric`);
  }

  // Метод для получения прогноза погоды по названию города
  async getForecast(city) {
    return this.fetchData(`${Config.API_URL_FORECAST}?q=${city}&appid=${Config.API_KEY}&units=metric`);
  }

  // Вспомогательный метод для выполнения HTTP-запросов
  async fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    // Если ответ не успешный, выбрасываем ошибку
    if (!response.ok) throw new Error(data.message);
    return data;
  }
}

// Класс для управления пользовательским интерфейсом
class UIManager {
  constructor() {
    // Инициализация ссылок на элементы DOM
    this.cityInput = document.getElementById("cityInput");
    this.resultArea = document.getElementById("resultArea");
    this.fileInput = document.getElementById("fileInput");
  }

  // Метод для отображения ошибок через alert
  showError(message) {
    alert(message);
  }

  // Метод для обновления текста в области результатов
  updateResult(text) {
    this.resultArea.value = text;
  }

  // Метод для получения введенного названия города
  getCityValue() {
    return this.cityInput.value;
  }

  // Метод для очистки всех полей ввода
  clearInputs() {
    this.cityInput.value = "";
    this.resultArea.value = "";
    this.fileInput.value = "";
  }

  // Метод для отображения всплывающих уведомлений
  showNotification(message, type = "info") {
    // Создаем элемент уведомления
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Устанавливаем стили для уведомления
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

    // Добавляем уведомление в DOM
    document.body.appendChild(notification);

    // Удаляем уведомление через 3 секунды с анимацией
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.5s";
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  // Метод для получения цвета уведомления в зависимости от типа
  getNotificationColor(type) {
    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      info: "#2196F3"
    };
    return colors[type] || colors.info;
  }
}

// Класс для работы с файлами
class FileManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  // Метод для сохранения данных в файл
  saveToFile() {
    const content = this.uiManager.resultArea.value;
    // Проверяем наличие данных для сохранения
    if (!content) {
      this.uiManager.showNotification("Нет данных для сохранения.", "error");
      return;
    }

    // Формируем объект с данными для сохранения
    const dataToSave = {
      content: content,
      timestamp: new Date().toISOString(),
      type: "weather-data",
      version: "1.0"
    };

    try {
      // Создаем Blob и ссылку для скачивания
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], {
        type: "application/json"
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = this.generateFileName();

      // Обновляем состояние кнопки сохранения
      const saveBtn = document.getElementById("saveToFileBtn");
      saveBtn.textContent = "Сохранение...";
      saveBtn.disabled = true;

      // Имитируем задержку для UX и выполняем сохранение
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

  // Метод для генерации имени файла на основе текущей даты
  generateFileName() {
    const date = new Date();
    return `weather_${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.json`;
  }

  // Метод для открытия и чтения файла
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

  // Метод для валидации загружаемого файла
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

  // Метод для чтения содержимого файла
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  // Метод для обработки содержимого прочитанного файла
  processFileContent(content) {
    try {
      // Пытаемся распарсить JSON
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
      // Если не удалось распарсить JSON, обрабатываем как текст
      this.uiManager.updateResult(content);
      this.uiManager.showNotification("Файл загружен как текст", "info");
    }
  }
}

// Основной класс приложения
class WeatherApp {
  constructor() {
    // Инициализация необходимых классов
    this.weatherAPI = new WeatherAPI();
    this.uiManager = new UIManager();
    this.fileManager = new FileManager(this.uiManager);
    this.initializeEventListeners();
  }

  // Инициализация обработчиков событий
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

  // Добавление кнопки закрытия соединения
  addCloseButton() {
    const closeButton = document.createElement("button");
    closeButton.id = "closeBtn";
    closeButton.textContent = "Close Connection";
    const textarea = document.getElementById("resultArea");
    textarea.parentNode.insertBefore(closeButton, textarea);
    closeButton.addEventListener("click", () => this.closeConnection());
  }

  // Метод для получения текущей погоды
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

  // Метод для получения прогноза погоды
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

  // Метод для получения координат города
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

  // Метод для закрытия соединения
  closeConnection() {
    this.uiManager.clearInputs();
    console.log("API connection closed");
    alert("Connection closed successfully");
  }
}

// Инициализация приложения при загрузке страницы
const weatherApp = new WeatherApp();