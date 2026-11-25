import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal";
import { H2, LegalShell, P, Ul } from "../legal-shell";

export const metadata: Metadata = {
  title: "Polityka prywatności — Bez Szumu",
  description: "Informacje o przetwarzaniu danych osobowych w serwisie Bez-Szumu.pl.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Polityka prywatności">
      <H2>1. Administrator danych</H2>
      <P>
        Administratorem danych osobowych jest {COMPANY.name}, {COMPANY.address}, NIP: {COMPANY.nip}, KRS: {COMPANY.krs}. Kontakt w sprawach danych osobowych: {COMPANY.email}.
      </P>

      <H2>2. Jakie dane przetwarzamy</H2>
      <Ul>
        <li>
          <strong>Dane konta:</strong> adres e-mail oraz identyfikator konta Google lub Apple, z którego się logujesz (otrzymujemy je od dostawcy logowania; nie otrzymujemy Twojego hasła).
        </li>
        <li>
          <strong>Dane o dostępie:</strong> data założenia konta, data końca okresu próbnego, status subskrypcji, data i wersja zaakceptowanego Regulaminu i Polityki prywatności.
        </li>
        <li>
          <strong>Dane płatności:</strong> po uruchomieniu płatnej subskrypcji dane transakcji (status, okres, identyfikator klienta) przetwarza operator płatności. Nie przechowujemy numeru karty.
        </li>
        <li>
          <strong>Dane techniczne:</strong> adres IP, informacje o przeglądarce i urządzeniu, logi serwera (niezbędne do bezpieczeństwa i działania Serwisu).
        </li>
        <li>
          <strong>Korespondencja:</strong> treść wiadomości, które do nas wysyłasz (np. zgłoszenia, reklamacje).
        </li>
      </Ul>

      <H2>3. Cele i podstawy prawne</H2>
      <Ul>
        <li>Założenie konta, logowanie i świadczenie usługi (Okres próbny, subskrypcja): art. 6 ust. 1 lit. b RODO (umowa).</li>
        <li>Rozliczenia, faktury i obowiązki podatkowe: art. 6 ust. 1 lit. c RODO (obowiązek prawny).</li>
        <li>Bezpieczeństwo Serwisu, zapobieganie nadużyciom (np. zakładaniu wielu kont), dochodzenie lub obrona roszczeń, obsługa zgłoszeń: art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes).</li>
        <li>Wykazanie zaakceptowania Regulaminu i Polityki prywatności: art. 6 ust. 1 lit. f RODO.</li>
      </Ul>

      <H2>4. Odbiorcy danych i podmioty przetwarzające</H2>
      <P>Korzystamy z dostawców, którzy przetwarzają dane w naszym imieniu lub na własny rachunek zgodnie z ich regulaminami:</P>
      <Ul>
        <li>Supabase (baza danych i uwierzytelnianie),</li>
        <li>Render (hosting aplikacji),</li>
        <li>Google i Apple (logowanie, a w przypadku Google także odtwarzacz YouTube i interfejs YouTube Data API),</li>
        <li>operator płatności (po uruchomieniu płatności),</li>
        <li>biuro rachunkowe i doradcy prawni (w zakresie niezbędnym do świadczenia usług).</li>
      </Ul>
      <P>
        Dane z Twojego konta nie są przekazywane dostawcom narzędzi AI, które analizują wyłącznie publicznie dostępne treści wideo. Dane mogą być przekazywane do państw spoza Europejskiego Obszaru Gospodarczego (np. USA) na podstawie standardowych klauzul umownych lub decyzji o odpowiednim stopniu ochrony (np. Data Privacy Framework).
      </P>

      <H2>5. Odtwarzacz YouTube</H2>
      <P>
        Filmy wyświetlamy za pomocą oficjalnego odtwarzacza YouTube w trybie rozszerzonej prywatności (youtube-nocookie.com). Odtwarzacz ładuje się dopiero przy filmach widocznych na ekranie, a po jego uruchomieniu YouTube (Google) może przetwarzać Twoje dane zgodnie z własną polityką prywatności.
      </P>

      <H2>6. Pliki cookie</H2>
      <P>
        Używamy wyłącznie niezbędnych plików cookie i pamięci przeglądarki, które utrzymują sesję po zalogowaniu i pozwalają zapamiętać akceptację dokumentów podczas logowania. Nie stosujemy reklamowych ani analitycznych plików cookie. Odtwarzacz YouTube może ustawiać własne pliki zgodnie z polityką Google.
      </P>

      <H2>7. Okres przechowywania</H2>
      <Ul>
        <li>Dane konta i dostępu: do czasu usunięcia konta przez Ciebie.</li>
        <li>Dokumenty księgowe i podatkowe: przez okres wymagany przepisami (zwykle 5 lat od końca roku podatkowego).</li>
        <li>Dane niezbędne do obrony lub dochodzenia roszczeń: do czasu przedawnienia roszczeń.</li>
        <li>Logi techniczne: przez krótki okres niezbędny do bezpieczeństwa i diagnostyki.</li>
      </Ul>

      <H2>8. Twoje prawa</H2>
      <P>Przysługuje Ci prawo do:</P>
      <Ul>
        <li>dostępu do danych i otrzymania ich kopii,</li>
        <li>sprostowania danych,</li>
        <li>usunięcia danych („prawo do bycia zapomnianym"): konto możesz usunąć samodzielnie na stronie „Moje konto" (/konto),</li>
        <li>ograniczenia przetwarzania,</li>
        <li>przenoszenia danych,</li>
        <li>sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie,</li>
        <li>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</li>
      </Ul>
      <P>Aby skorzystać z praw, napisz na adres {COMPANY.email}.</P>

      <H2>9. Zautomatyzowane decyzje i oceny AI</H2>
      <P>
        Oceny w Serwisie dotyczą treści publicznych materiałów i są generowane automatycznie. Nie podejmujemy wobec Użytkowników zautomatyzowanych decyzji wywołujących skutki prawne, w tym profilowania. Dostęp do usługi zależy wyłącznie od statusu Okresu próbnego lub subskrypcji.
      </P>

      <H2>10. Dobrowolność i zmiany</H2>
      <P>
        Podanie danych jest dobrowolne, ale niezbędne do założenia konta i korzystania z pełnej wersji Serwisu. O istotnych zmianach tej Polityki poinformujemy w Serwisie.
      </P>
    </LegalShell>
  );
}
