const $ = (id) => document.getElementById(id);


/* ALL STEPS */

const steps = [
  "step1",
  "step2",
  "step3",
  "step4",
  "stepPlace",
  "step5",
  "step6"
];


/* ANSWERS */

const answers = {

  date: "",

  startTime: "",

  endTime: "",

  food: "",

  dessert: "",

  juice: "",

  place: ""

};


/*
  IMPORTANT:

  Replace YOUR_FORM_ID with your
  real Formspree ID.

  Example:

  https://formspree.io/f/abcdwxyz
*/

const FORM_URL =
  "https://formspree.io/f/YOUR_FORM_ID";


/* SHOW STEP */

function show(id) {

  steps.forEach((step) => {

    $(step).classList.remove("active");

  });

  $(id).classList.add("active");


  if (id === "step6") {

    startHearts();

  }

}


/* =========================
   STEP 1
========================= */

$("yesBtn").addEventListener(
  "click",
  () => {

    show("step2");

  }
);


/*
  NO BUTTON RUNS AWAY
*/

const noBtn = $("noBtn");


function moveNo() {

  noBtn.style.position = "fixed";

  const maxX =
    window.innerWidth -
    noBtn.offsetWidth -
    10;

  const maxY =
    window.innerHeight -
    noBtn.offsetHeight -
    10;


  noBtn.style.left =
    Math.max(
      10,
      Math.random() * maxX
    ) + "px";


  noBtn.style.top =
    Math.max(
      10,
      Math.random() * maxY
    ) + "px";

}


noBtn.addEventListener(
  "mouseover",
  moveNo
);


noBtn.addEventListener(
  "touchstart",
  (event) => {

    event.preventDefault();

    moveNo();

  }
);


noBtn.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    moveNo();

  }
);


/* =========================
   STEP 2
========================= */

$("okBtn").addEventListener(
  "click",
  () => {

    show("step3");

  }
);


/* =========================
   STEP 3
   DATE + START + END TIME
========================= */

$("dateBtn").addEventListener(
  "click",
  () => {

    const date =
      $("dateInput").value;

    const start =
      $("startTime").value;

    const end =
      $("endTime").value;


    /* CHECK DATE */

    if (!date) {

      $("dateError").textContent =
        "Please pick a day 🥺";

      return;

    }


    /* CHECK START TIME */

    if (!start) {

      $("dateError").textContent =
        "Please select a start time ⏰";

      return;

    }


    /* CHECK END TIME */

    if (!end) {

      $("dateError").textContent =
        "Please select an end time ⏰";

      return;

    }


    /*
      Convert time into minutes
      so we can compare start/end.
    */

    const startMinutes =
      convertTimeToMinutes(start);

    const endMinutes =
      convertTimeToMinutes(end);


    /* END MUST BE AFTER START */

    if (endMinutes <= startMinutes) {

      $("dateError").textContent =
        "End time must be after start time 💗";

      return;

    }


    /* CHECK DATE RANGE */

    if (
      date < "2026-11-01" ||
      date > "2026-12-31"
    ) {

      $("dateError").textContent =
        "Only November or December 2026 please 💗";

      return;

    }


    /* SAVE DATE */

    answers.date =
      new Date(
        date + "T00:00:00"
      ).toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );


    /* SAVE TIMES */

    answers.startTime = start;

    answers.endTime = end;


    $("dateError").textContent = "";


    show("step4");

  }
);


/* =========================
   TIME CONVERTER
========================= */

function convertTimeToMinutes(time) {

  const parts =
    time.split(" ");

  const hm =
    parts[0].split(":");

  let hour =
    parseInt(hm[0]);

  const minute =
    parseInt(hm[1]);

  const period =
    parts[1];


  if (
    period === "PM" &&
    hour !== 12
  ) {

    hour += 12;

  }


  if (
    period === "AM" &&
    hour === 12
  ) {

    hour = 0;

  }


  return (
    hour * 60 + minute
  );

}


/* =========================
   FOOD / DESSERT / JUICE /
   PLACE SELECTOR
========================= */

function setupPicker(
  gridId,
  answerKey
) {

  const buttons =
    document.querySelectorAll(
      "#" + gridId + " .opt"
    );


  buttons.forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        buttons.forEach(
          (item) => {

            item.classList.remove(
              "selected"
            );

          }
        );


        button.classList.add(
          "selected"
        );


        answers[answerKey] =
          button.dataset.value;

      }
    );

  });

}


/* SETUP PICKERS */

setupPicker(
  "foodGrid",
  "food"
);

setupPicker(
  "dessertGrid",
  "dessert"
);

setupPicker(
  "juiceGrid",
  "juice"
);

setupPicker(
  "placeGrid",
  "place"
);


/* =========================
   STEP 4
========================= */

$("foodBtn").addEventListener(
  "click",
  () => {

    if (
      !answers.food ||
      !answers.dessert ||
      !answers.juice
    ) {

      $("foodError").textContent =
        "Pick your food, dessert and juice 😋";

      return;

    }


    $("foodError").textContent = "";


    show("stepPlace");

  }
);


/* =========================
   STEP 5: PLACE
========================= */


/* BACK */

$("placeBack").addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    show("step4");

  }
);


/* NEXT */

$("placeBtn").addEventListener(
  "click",
  () => {

    if (!answers.place) {

      $("placeError").textContent =
        "Pick a place 📍";

      return;

    }


    $("placeError").textContent = "";


    show("step5");

  }
);


/* =========================
   STEP 6: FEE
========================= */


/* GO BACK */

$("backLink").addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    show("stepPlace");

  }
);


/* PAY / CONFIRM */

$("payBtn").addEventListener(
  "click",
  () => {


    $("summary").innerHTML =

      "📅 <b>" +
      answers.date +
      "</b><br>" +

      "⏰ <b>" +
      answers.startTime +
      " – " +
      answers.endTime +
      "</b><br>" +

      "📍 <b>" +
      answers.place +
      "</b><br>" +

      "🍽️ <b>" +
      answers.food +
      "</b><br>" +

      "🍰 <b>" +
      answers.dessert +
      "</b><br>" +

      "🧃 <b>" +
      answers.juice +
      "</b>";


    show("step6");

  }
);


/* =========================
   FINAL ACCEPT
========================= */

$("acceptBtn").addEventListener(
  "click",
  async () => {

    const button =
      $("acceptBtn");


    button.disabled = true;

    button.textContent =
      "sending... 💌";


    try {

      const response =
        await fetch(
          FORM_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "Accept":
                "application/json"
            },

            body:
              JSON.stringify({

                _subject:
                  "Ashika accepted your date! 💗",

                message:
                  "She said YES! 🥳",

                date:
                  answers.date,

                start_time:
                  answers.startTime,

                end_time:
                  answers.endTime,

                place:
                  answers.place,

                food:
                  answers.food,

                dessert:
                  answers.dessert,

                juice:
                  answers.juice

              })

          }
        );


      if (response.ok) {

        button.textContent =
          "See you soon 💗";

      } else {

        button.textContent =
          "See you soon 💗";

      }


    } catch (error) {

      /*
        The website still shows the
        final message even if Formspree
        isn't connected yet.
      */

      button.textContent =
        "See you soon 💗";

    }

  }
);


/* =========================
   FLOATING HEARTS
========================= */

let heartsStarted = false;


function startHearts() {

  /*
    Prevent multiple intervals
    when the final page is opened.
  */

  if (heartsStarted) {
    return;
  }

  heartsStarted = true;


  setInterval(
    () => {

      const heart =
        document.createElement(
          "div"
        );


      heart.className =
        "float-heart";


      heart.textContent =
        [
          "💗",
          "💖",
          "💕",
          "🌸"
        ][
          Math.floor(
            Math.random() * 4
          )
        ];


      heart.style.left =
        Math.random() * 100 +
        "vw";


      document.body.appendChild(
        heart
      );


      setTimeout(
        () => {

          heart.remove();

        },
        4000
      );

    },
    400
  );

}