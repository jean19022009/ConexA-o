const menuMobile = document.getElementById("menuMobile");

const sidebar = document.getElementById("sidebar");

const navLinks = document.querySelectorAll(".nav-link");

const sections = document.querySelectorAll("section[id]");


// ================= MENU MOBILE =================

menuMobile.addEventListener("click", () => {

    sidebar.classList.toggle("open");

});


// ================= FECHAR MENU =================

navLinks.forEach(link => {

    link.addEventListener("click", () => {

        sidebar.classList.remove("open");

    });

});


// ================= MENU DINÂMICO =================

window.addEventListener("scroll", () => {

    let currentSection = "";


    sections.forEach(section => {

        const sectionTop = section.offsetTop;

        const sectionHeight = section.offsetHeight;


        if (
            window.scrollY >=
            sectionTop - sectionHeight * 0.3
        ) {

            currentSection =
                section.getAttribute("id");

        }

    });


    navLinks.forEach(link => {

        link.classList.remove("active");


        if (
            link.getAttribute("href") ===
            "#" + currentSection
        ) {

            link.classList.add("active");

        }

    });

});

