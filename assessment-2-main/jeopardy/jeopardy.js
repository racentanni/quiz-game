// categories is the main data structure for the app; it looks like this:

//  [
//    { title: "Math",
//      clues: [
//        {question: "2+2", answer: 4, showing: null},
//        {question: "1+1", answer: 2, showing: null}
//        ...
//      ],
//    },
//    { title: "Literature",
//      clues: [
//        {question: "Hamlet Author", answer: "Shakespeare", showing: null},
//        {question: "Bell Jar Author", answer: "Plath", showing: null},
//        ...
//      ],
//    },
//    ...
//  ]

// ~~~ API GLOBALS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ API GLOBALS ~~~~~~~~~~~~~~~~~~~~~~~~~~~

let categories = [];  // holds all the categories and questions
const BASE_URL = `http://cluebase.lukelav.in`;
const QUESTION_COUNT = 5;
const CATEGORY_COUNT = 6;

class Category {
  /** Get NUM_CATEGORIES random category from API.
   *
   * Returns array of category names
   */
  static async getCategoryNames() {
    let response = await axios.get(`${BASE_URL}/categories`, {
      params: {
        limit: "100",
        offset: Math.floor(Math.random() * (500 - 1) + 1) // RNG to vary offset between each request
      }
    });
    console.log(response.data);

    let randomCategories = _.sampleSize(response.data.data, CATEGORY_COUNT);

    let categoryNames = randomCategories.map((catObj) => {
      return catObj.category;
    });
    console.log(categoryNames);

    return categoryNames;
  }

  /** Get category data from API by category name.
   *
   * Returns category object with title and clues
   */
  static async getCategoryData(categoryName) {
    let response = await axios.get(`${BASE_URL}/clues`, {
      params: {
        category: categoryName
      }
    });
    console.log(response.data);
    if (!response.data.data.length) {
      throw new Error(`Category with name ${categoryName} does not have any clues`);
    }

    // Lodash selects 5 random questions
    let selectFiveQuestions = _.sampleSize(response.data.data, QUESTION_COUNT);

    // format each question object inside array
    let questionArray = selectFiveQuestions.map((clue) => {
      if (clue.response.startsWith('<i>')) {
        clue.response = clue.response.slice(3, -3);
      }
      return {
        question: clue.clue,
        answer: clue.response,
        showing: null
      };
    });

    let categoryData = {
      title: categoryName,
      clues: questionArray
    };
    return categoryData;
  }

  // Fill 'categories' array with 6 objects, each with 5 questions
  static async getAllCategoriesAndQuestions() {
    categories = [];
    let categoryNames = await Category.getCategoryNames();
    for (let categoryName of categoryNames) {
      try {
        let fullCategory = await Category.getCategoryData(categoryName);
        categories.push(fullCategory);
      } catch (error) {
        console.error(`Error fetching category with name ${categoryName}:`, error);
      }
    }
    console.log(categories);
    return categories;
  }
}

$(async function () {
  const $button = $("button");
  const $tDiv = $("#table-container");

  // for formatting category titles
  function toTitleCase(str) {
    let lcStr = str.toLowerCase();
    return lcStr.replace(/(?:^|\s)\w/g, (match) => {
      return match.toUpperCase();
    });
  }

  /** Fill the HTML table#jeopardy with the categories & cells for questions.
   *
   * - The <thead> should be filled w/a <tr>, and a <td> for each category
   * - The <tbody> should be filled w/NUM_QUESTIONS_PER_CAT <tr>s,
   *   each with a question for each category in a <td>
   *   (initally, just show a "?" where the question/answer would go.)
   */
  async function fillTable() {
    let $tHead = $("<thead>");
    let $tBody = $("<tbody>");
    let $table = $("<table>")
      .prepend($tHead)
      .append($tBody);

    // generate header cells, apply category title on the way, append to thead
    for (let k = 0; k < CATEGORY_COUNT; k++) {
      if (categories[k] && categories[k].title) {
        let $tCell = $("<th>")
          .attr("id", `cat-${k}`)
          .text(toTitleCase(categories[k].title));
        $tHead.append($tCell);
      } else {
        console.error(`Category at index ${k} is invalid:`, categories[k]);
      }
    }

    // generate each table cell with '?', add coordinate ID, append to row, row appends to tbody
    for (let j = 0; j < QUESTION_COUNT; j++) {
      let $tRow = $("<tr>");
      for (let i = 0; i < CATEGORY_COUNT; i++) {
        let $qMark = $("<i>")
          .attr("class", "fas fa-question-circle");
        let $tCell = $("<td>")
          .attr("id", `${i}-${j}`)
          .append($qMark);
        $tRow.append($tCell);
      }
      $tBody.append($tRow);
    }

    // append whole table to container div
    $tDiv.append($table);
  }

  /** Handle clicking on a clue: show the question or answer.
   *
   * Uses .showing property on clue to determine what to show:
   * - if currently null, show question & set .showing to "question"
   * - if currently "question", show answer & set .showing to "answer"
   * - if currently "answer", ignore click
   */
  function showQuestionOrAnswer(id) {
    let $clickedCell = $(`#${id}`);
    let [categoryIndex, questionIndex] = id.split('-').map(Number);

    // shorthand variables for game data
    let theCell = categories[categoryIndex].clues[questionIndex];
    let theQuestion = theCell.question;
    let theAnswer = theCell.answer;

    // check clicked question for what .showing is
    if (theCell.showing === null) { // show the question
      $clickedCell.text(theQuestion);
      theCell.showing = "question";
    }
    else if (theCell.showing === "question") { // show the answer
      $clickedCell.toggleClass("answer")
      $clickedCell.text(theAnswer);
      theCell.showing = "answer";
      $clickedCell.toggleClass("not-allowed");
    }
  }

  /** Wipe the current Jeopardy board, show the loading spinner,
   * and update the button used to fetch data.
   */
  function showLoadingView() {
    $button.text("Loading...").toggleClass("not-allowed");
    $tDiv.empty(); // clear game board
    let $loading = $("<i>")
      .attr("class", "fas fa-spinner fa-pulse loader");
    $tDiv.append($loading);
  }

  /** Remove the loading spinner and update the button used to fetch data. */
  function hideLoadingView() {
    $button.text("Restart!").toggleClass("not-allowed");
    $tDiv.empty();
  }

  /** Start game:
   *
   * - get random category names
   * - get data for each category
   * - create HTML table
   */
  async function setupAndStart() {
    showLoadingView(); // start load screen
    await Category.getAllCategoriesAndQuestions(); // call API and format data
    hideLoadingView(); // hide load screen
    console.log("Categories array:", categories);
    fillTable(); // table creation and labeling
    addListeners(); // apply event listener to table
  }

  /** On click of start / restart button, set up game. */
  $button.on("click", async () => {
    setupAndStart();
  });

  /** On page load, add event handler for clicking clues */
  async function addListeners() {
    const $gameTable = $("table");
    $gameTable.on("click", "td", (evt) => {
      showQuestionOrAnswer(evt.target.id);
    });
  }
});