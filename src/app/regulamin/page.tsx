import type { Metadata } from "next";
import { COMPANY, PLANS } from "@/lib/legal";
import { H2, LegalShell, P, Ul } from "../legal-shell";

export const metadata: Metadata = {
  title: "Regulamin — Bez Szumu",
  description: "Regulamin świadczenia usług drogą elektroniczną w serwisie Bez-Szumu.pl.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Regulamin serwisu Bez-Szumu.pl">
      <H2>§ 1. Postanowienia ogólne</H2>
      <P>
        Niniejszy Regulamin określa zasady korzystania z serwisu internetowego dostępnego pod adresem {COMPANY.site} („Serwis") oraz zasady świadczenia usług drogą elektroniczną.
      </P>
      <P>Usługodawcą i administratorem Serwisu jest:</P>
      <Ul>
        <li>{COMPANY.name},</li>
        <li>siedziba i adres do doręczeń: {COMPANY.address},</li>
        <li>NIP: {COMPANY.nip}, KRS: {COMPANY.krs},</li>
        <li>adres e-mail do kontaktu: {COMPANY.email}.</li>
      </Ul>
      <P>
        Serwis prezentuje ranking i oceny polskich wywiadów oraz rozmów publikowanych w serwisie YouTube, wraz z krótkim streszczeniem, znacznikami czasu i oceną zgodności tytułu z treścią. Oceny i streszczenia są generowane automatycznie z użyciem narzędzi sztucznej inteligencji i mogą być korygowane przez redaktora.
      </P>
      <P>
        Do korzystania z Serwisu potrzebne są: urządzenie z dostępem do internetu, aktualna przeglądarka z włączoną obsługą JavaScript i plików cookie (niezbędnych do logowania) oraz konto Google lub Apple.
      </P>

      <H2>§ 2. Konto użytkownika</H2>
      <Ul>
        <li>Konto zakłada się wyłącznie przez logowanie kontem Google lub Apple. Rejestracja adresem e-mail i hasłem nie jest dostępna.</li>
        <li>Zakładając konto, Użytkownik potwierdza, że zapoznał się z Regulaminem i Polityką prywatności oraz je akceptuje.</li>
        <li>Użytkownik może posiadać jedno konto i nie może udostępniać go innym osobom.</li>
        <li>Użytkownik musi mieć pełną zdolność do czynności prawnych albo zgodę przedstawiciela ustawowego.</li>
        <li>Usługodawca może zawiesić lub usunąć konto w razie rażącego naruszenia Regulaminu, w szczególności zakładania wielu kont w celu obejścia okresu próbnego lub zautomatyzowanego pobierania zawartości Serwisu.</li>
      </Ul>

      <H2>§ 3. Okres próbny i płatności</H2>
      <Ul>
        <li>Po pierwszym zalogowaniu Użytkownik otrzymuje 30 dni pełnego dostępu bez opłat i bez podawania danych karty płatniczej („Okres próbny").</li>
        <li>Po zakończeniu Okresu próbnego pełny dostęp do Serwisu jest płatny. Cena wynosi {PLANS.monthly} brutto miesięcznie albo {PLANS.yearly} brutto rocznie (ceny zawierają podatek VAT). Aktualne ceny są podawane przed zawarciem umowy.</li>
        <li>Płatności obsługuje zewnętrzny operator płatności. Subskrypcja odnawia się automatycznie na kolejne okresy rozliczeniowe do czasu jej wypowiedzenia.</li>
        <li>Użytkownik może w każdej chwili wypowiedzieć subskrypcję; dostęp trwa do końca opłaconego okresu rozliczeniowego. Opłaty za rozpoczęty okres nie podlegają zwrotowi, z zastrzeżeniem przepisów o prawach konsumenta.</li>
        <li>Osoba bez konta lub z zakończonym Okresem próbnym bez aktywnej subskrypcji ma dostęp do ograniczonego podglądu Serwisu.</li>
      </Ul>

      <H2>§ 4. Prawo odstąpienia od umowy (konsumenci)</H2>
      <Ul>
        <li>Konsument może odstąpić od umowy o płatny dostęp w terminie 14 dni od jej zawarcia, bez podawania przyczyny, składając oświadczenie na adres e-mail Usługodawcy.</li>
        <li>Jeżeli Użytkownik wyraźnie zażąda rozpoczęcia świadczenia usługi przed upływem tego terminu, a następnie utraci prawo odstąpienia po pełnym wykonaniu usługi (lub w zakresie dostarczonej treści cyfrowej), zostanie o tym poinformowany przed zakupem i będzie musiał to potwierdzić.</li>
        <li>Okres próbny jest bezpłatny i nie wymaga odstępowania od umowy.</li>
      </Ul>

      <H2>§ 5. Charakter treści i odpowiedzialność za nie</H2>
      <Ul>
        <li>Oceny, streszczenia, etykiety i tagi są automatyczną, subiektywną opinią o treści materiału (nie o osobach) i mogą zawierać błędy lub uproszczenia.</li>
        <li>Treści Serwisu mają charakter informacyjny i nie stanowią porady prawnej, finansowej, politycznej ani żadnej innej porady profesjonalnej.</li>
        <li>Filmy i ich opisy należą do ich twórców. Serwis nie kopiuje ani nie przechowuje filmów: wyświetla oficjalny odtwarzacz YouTube i linkuje do oryginałów. Korzystanie z materiałów w YouTube podlega regulaminowi YouTube.</li>
        <li>Usługodawca nie odpowiada za treść materiałów zamieszczonych przez osoby trzecie.</li>
      </Ul>

      <H2>§ 6. Prawa autorskie</H2>
      <P>
        Układ, kod, oceny i opracowania w Serwisie stanowią własność Usługodawcy lub są wykorzystywane na podstawie odpowiednich uprawnień. Zabrania się ich kopiowania, masowego pobierania i dalszego udostępniania bez zgody Usługodawcy, poza dozwolonym użytkiem. Znaki i materiały źródłowe należą do ich właścicieli.
      </P>

      <H2>§ 7. Zgłoszenia sprostowań i usunięcia materiałów</H2>
      <Ul>
        <li>Twórca, uczestnik rozmowy lub inna osoba, która uważa, że ocena, streszczenie lub wzmianka w Serwisie jest nieprawdziwa, nieścisła albo narusza jej prawa, może zgłosić to na adres {COMPANY.email}.</li>
        <li>Zgłoszenie powinno wskazywać materiał (adres lub tytuł), zastrzeżenia oraz dane kontaktowe zgłaszającego.</li>
        <li>Usługodawca rozpatruje zgłoszenie bez zbędnej zwłoki, w miarę możliwości w ciągu 7 dni, i odpowiada na nie. W uzasadnionych przypadkach korekta lub usunięcie następuje niezwłocznie, także na czas wyjaśniania sprawy.</li>
      </Ul>

      <H2>§ 8. Reklamacje</H2>
      <P>
        Reklamacje dotyczące działania Serwisu lub płatnej usługi można składać na adres {COMPANY.email}. Reklamacja powinna zawierać opis problemu i dane kontaktowe. Usługodawca rozpatruje reklamację w terminie 14 dni od jej otrzymania i informuje o rozstrzygnięciu na podany adres.
      </P>

      <H2>§ 9. Usunięcie konta</H2>
      <P>
        Użytkownik może w każdej chwili usunąć konto samodzielnie na stronie „Moje konto" (/konto). Usunięcie konta powoduje trwałe usunięcie jego danych w Serwisie, z zastrzeżeniem danych, które Usługodawca musi przechowywać na podstawie przepisów (np. dokumentów księgowych). Przed usunięciem konta z aktywną płatną subskrypcją należy ją wypowiedzieć.
      </P>

      <H2>§ 10. Odpowiedzialność i dostępność</H2>
      <Ul>
        <li>Usługodawca dokłada starań, aby Serwis działał nieprzerwanie, ale nie gwarantuje jego stałej dostępności. Mogą występować przerwy techniczne.</li>
        <li>Wobec przedsiębiorców odpowiedzialność Usługodawcy jest ograniczona do wysokości opłat zapłaconych za ostatnie 3 miesiące, z wyłączeniem szkód wynikłych z winy umyślnej. Ograniczenie nie dotyczy konsumentów.</li>
      </Ul>

      <H2>§ 11. Zmiany Regulaminu</H2>
      <P>
        Usługodawca może zmienić Regulamin z ważnych przyczyn (zmiana przepisów, zmiana funkcji lub cen, względy techniczne). O zmianie Użytkownicy zostaną poinformowani w Serwisie lub e-mailem co najmniej 14 dni przed wejściem jej w życie. Użytkownik, który nie akceptuje zmian, może usunąć konto. Zmiana cen nie dotyczy już opłaconych okresów rozliczeniowych.
      </P>

      <H2>§ 12. Postanowienia końcowe</H2>
      <Ul>
        <li>Do umów zawieranych w ramach Serwisu stosuje się prawo polskie. Wobec konsumentów z innych państw UE nie pozbawia to ochrony wynikającej z bezwzględnie obowiązujących przepisów ich państwa.</li>
        <li>Spory rozstrzyga sąd właściwy według przepisów ogólnych; konsument może skorzystać z pozasądowych metod rozwiązywania sporów, w tym z unijnej platformy ODR: https://ec.europa.eu/consumers/odr.</li>
        <li>Regulamin wchodzi w życie z dniem wskazanym w nagłówku dokumentu.</li>
      </Ul>
    </LegalShell>
  );
}
