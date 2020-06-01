import data from '../fixtures/data'
import Setup from '../support/setup'
import { DEFAULT, CONFIG } from '../../src/config'

let Shikwasa, shk, document

beforeEach(() => {
  cy.visit('cypress.html')
  cy.document().then($doc => {
    document = $doc
  })
  shk = null
  cy.window().then($window => {
    Shikwasa = $window.Shikwasa
  })
})

describe('Player initiation', () => {
  it('renders default config, when no options other than audio src is provided', () => {
    shk = new Shikwasa({
      audio: { src: '#' },
    })

    cy.get('body').children('.shk')
      .should('have.attr', 'data-fixed-type', DEFAULT.fixed.type)
      .and('have.attr', 'data-theme', DEFAULT.theme)
      .and('have.attr','data-play', 'paused')
      .and('not.contain.attr', 'data-mute')
      .and('not.contain.attr', 'data-has-chapter')
    cy.get('.shk-title').contains(CONFIG.audioOptions.title)
    cy.get('.shk-artist').contains(CONFIG.audioOptions.artist)
    cy.get('.shk-cover').should('have.css', 'background-image','none')
    cy.get('.shk-time_duration').contains('00:00')
    cy.get('.shk-controls').within(() =>{
      cy.get('.shk-btn').should('have.color', DEFAULT.themeColor)
      cy.get('.shk-btn_download').should('not.exist')
    })
  })

  it('renders parsed data, when no audio info is provided but parser is used', () => {
    const options = { parser: Setup.Parser, audio: { src: data.src } }
    shk = new Shikwasa(options)

    cy.get('.shk-title').contains(data.parsedAudio.title)
    cy.get('.shk-artist').contains(data.parsedAudio.artist)
    cy.get('.shk-cover')
      .should('have.css', 'background-image')
      .and('match', /blob/)
    cy.get('.shk-time_duration').contains(data.parsedAudio.duration_display)
  })

  describe('renders custom data', () => {
    let container, options
    const parser = {
      'with parser': Setup.Parser,
      'without parser': null,
    }

    beforeEach(() => {
      container = document.querySelector('.shk-container')
      options = {
        container: container,
        fixed: {
          type: 'fixed',
          position: 'bottom',
        },
        download: true,
        themeColor: 'white',
        theme: 'dark',
        autoPlay: true,
        muted: true,
        preload: 'none',
        speedOptions: [2],
        audio: data.customAudio,
      }
    })

    Object.keys(parser).forEach(k => {
      it(`renders custom data ${k}'s presence`, () => {
        options.parser = parser[k]
        shk = new Shikwasa(options)
        cy.get('.shk-container').find('.shk')
          .should('have.attr', 'data-fixed-type', 'fixed')
          .and('have.attr', 'data-theme', 'dark')
          .and('have.attr', 'data-mute')
          .and('not.contain.attr', 'data-has-chapter')
        cy.get('.shk-title')
          .contains(data.customAudio.title)
        cy.get('.shk-artist')
          .contains(data.customAudio.artist)
        cy.get('.shk-cover')
          .should('have.css', 'background-image', `url("${Cypress.config().baseUrl + data.customAudio.cover}")`)
        cy.get('.shk-time_duration').contains(data.customAudio.duration_display)
        cy.get('.shk-controls').within(() => {
          cy.get('.shk-btn')
            .should('have.color', 'white')
          cy.get('.shk-btn_download')
            .should('exist')
        })
      })
    })
  })

  describe('renders duration display and seek control', () => {
    const parser = {
      'with parser': Setup.Parser,
      'without parser': null,
    }
    const preload = ['none', 'auto', 'metadata']
    const duration = [undefined, data.customAudio.duration]

    duration.forEach(d => {
      Object.keys(parser).forEach(k => {
        preload.forEach(p => {
          const options = { audio: { src: data.src } }
          options.audio.duration = d
          options.parser = parser[k]
          options.preload = p
          if (options.preload === 'none' && !options.audio.duration && !options.parser) {
            it('renders duration as 0 and disable seek controls when duration is unknown', () => {
              shk = new Shikwasa(options)
              shk.on('inited', () => {
                cy.get('.shk-time_duration').contains('00:00')
                expect(shk.ui.seekControls.every(el => el.disabled)).to.be.true
              })
            })
          } else {
            it(`enable seek controls if custom duration=${options.audio.duration}, ${k}, preload=${p}`, () => {
              shk = new Shikwasa(options)
              if (!options.audio.duration && !options.parser) {
                shk.on('durationchange', () => {
                  expect(shk.ui.seekControls.every(el => !el.disabled)).to.be.true
                })
              } else {
                shk.on('inited', () => {
                  expect(shk.ui.seekControls.every(el => !el.disabled)).to.be.true
                })
              }
            })
          }

          if (options.audio.duration) {
            it('renders custom data if present', () => {
              shk = new Shikwasa(options)
              shk.on('inited', () => {
                cy.get('.shk-time_duration').contains(data.customAudio.duration_display)
              })
            })
          }

          if (!options.audio.duration && options.parser) {
            it('renders parsed data if no custom data is provided', () => {
              shk = new Shikwasa(options)
              shk.on('inited', () => {
                cy.get('.shk-time_duration').contains(data.parsedAudio.duration_display)
              })
            })
          }
        })
      })
    })
  })
})

describe('Player controls', () => {
  let shk
  beforeEach(() => {
    shk = new Shikwasa({
      audio: data.customAudio,
      download: true,
    })
  })

  it('toggles playback state when clicking play button', () => {
    cy.get('.shk-btn_toggle').as('toggleBtn')
      .click().then(() => {
      cy.get('.shk').as('shk')
        .should('have.attr', 'data-play', 'playing')
      expect(shk.audio.paused).to.be.false
    })

    cy.get('@toggleBtn').click().then(() => {
      cy.get('@shk')
        .should('have.attr', 'data-play', 'paused')
        expect(shk.audio.paused).to.be.true
    })
  })

  it('changes speed when clicking playback speed button', () => {
    const speed = shk.options.speedOptions
    let index = speed.indexOf(shk.audio.playbackRate)
    for(let i = 0; i < speed.length; i++) {
      cy.get('.shk-btn_speed').as('speedBtn').click().then($el => {
        expect($el.text()).to.match(new RegExp(speed[index + 1]))
        expect(shk.audio.playbackRate).to.equal(speed[index + 1])
        index = speed.indexOf(shk.audio.playbackRate)
        if (index === speed.length - 1) {
          index = -1
        }
      })
    }
  })

  describe('Seek buttons', () => {
    it('seeks forward when clicking seekFoward button', () => {
      cy.get('.shk-btn_forward').click().then(() => {
        expect(shk.currentTime).equals(10)
      })
    })

    it('seeks backward when clicking seekBackward button', () => {
        shk.seek(50)
        cy.get('.shk-btn_backward').click($el => {
          expect($el.text()).equals(40)
        })
    })

    it('cannot seek less than 0', () => {
      cy.get('.shk-btn_backward').click()
      cy.get('.shk-time_now').contains('00:00')
    })

    it('cannot seek beyond duration', () => {
      cy.get('.shk-bar').click({ position: 'right' })
      cy.get('.shk-btn_forward').click()
      cy.get('.shk-time_now').then($el => {
        expect($el.text()).to.be.oneOf(['00:00', '11:07'])
      })
    })
  })

  describe('Extra control panel', () => {
    it('toggles extra control panel when clicking more', () => {
      cy.get('.shk-controls_extra').as('extra')
        .should('not.be.visible')
      cy.get('.shk-btn_more').as('moreBtn').click()
      cy.get('@extra')
        .should('be.visible')

      cy.get('@moreBtn').click()
      cy.get('@extra')
        .should('not.be.visible')
    })

    it('auto hides extra control panel when clicking an action button', () => {
      cy.get('.shk-btn_more').click()
      cy.get('.shk-btn_mute').click({ force: true })
      cy.get('.shk-controls_extra').as('extra')
        .should('not.be.visible')
    })
  })

  it('toggles mute when clicking mute button', () => {
    cy.get('.shk-btn_mute').click({ force: true }).then(() => {
      expect(shk.audio.muted).to.be.true
    })
    cy.get('.shk')
      .should('have.attr', 'data-mute')

    cy.get('.shk-btn_mute').click({ force: true }).then(() => {
      expect(shk.audio.muted).to.be.false
    })
    cy.get('.shk')
      .should('not.have.attr', 'data-mute')
  })

  it.skip('downloads audio when clicking download button', () => {
    cy.get('.shk-btn_download').click({ force: true }).then($el => {
      const url = $el.prop('href')
      cy.request(url).then(resp => {
        expect(resp.status).equals(200)
        expect(resp.headers)
          .to.have.property('content-type')
          .and.match(/audio/)
      })
    })
  })
})

describe('Progress bar controls', () => {
  let shk
  beforeEach(() => {
    shk = new Shikwasa({
      audio: data.parsedAudio,
      preload: 'auto',
    })
  })

  describe('When audio playback time changes, ui updates accordingly', () => {
    it('displays playing progress correctly', (done) => {
      const targetTime = 20
      let expectedWidth
      shk.on('timeupdate', () => {
        cy.get('.shk-bar').then($el => {
          expectedWidth = $el.outerWidth() * targetTime / shk.audio.duration
          // workaround for not being able to get computed width on load
          cy.get('.shk-bar_played').then(el => {
            setTimeout(() => {
              expect(el.outerWidth()).to.be.closeTo(expectedWidth, 1)
              done()
            }, 500)
          })
        })
      })
      shk.audio.currentTime = targetTime
    })

    it('displays loading progress correctly', () => {
      shk.on('progress', (done) => {
        const buffer = shk.audio.buffered
        if (buffer.length) {
          cy.get('.shk-bar_loaded').then($el => {
            setTimeout(() => {
              expect($el.width()).to.be.above(0)
              done()
            }, 500)
          })
        }
      })
    })
  })

  describe('when performing actions related to progress bar, audio current time mutates', () => {
    it('seeks to target time on clicking progress bar', () => {
      let percentage
      cy.get('.shk-bar').click().then($parent => {
        cy.get('.shk-bar_played').then($child => {
          percentage = $child.outerWidth() / $parent.outerWidth()
          expect(shk.audio.currentTime / shk.audio.duration).to.be.closeTo(percentage, 1)
        })
      })
    })

    it('seeks to target time on dragging slider', () => {
      let offsetLeft
      const moveLength = 200
      cy.get('.shk-bar').as('bar')
        .trigger('mousedown', { which: 1, position: 'left'}).get('.shk-bar_played').then($el => {
          offsetLeft = $el.offset().left
        })
      cy.get('@bar').trigger('mousemove', { clientX: moveLength, clientY: 0 })
        .trigger('mouseup', { clientX: moveLength, clientY: 0 })
        .then(($parent) => {
          cy.get('.shk-bar_played').then(($child) => {
            expect($child.outerWidth()).to.be.closeTo(moveLength - offsetLeft, 1)
            const percentage = (offsetLeft + moveLength) / $parent.outerWidth()
            expect(shk.audio.currentTime / shk.audio.duration).to.be.closeTo(percentage, 1)
          })
        })
    })

    describe('seeks to target time on keyboard actions', () => {
      const cases = [
        { action: 'rightarrow', expected: 0.01 },
        { action: 'uparrow', expected: 0.01 },
        { action: 'downarrow', expected: -0.01 },
        { action: 'leftarrow', expected: -0.01 },
        { action: 'pagedown', expected: -0.1 },
        { action: 'pageup', expected: 0.1 },
        { action: 'home', expected: 0 },
        { action: 'end', expected: 1 },
      ]
      const initTime = 100
      cases.forEach(c => {
        it(`seeks to target time on ${c.action}`, () => {
          shk.seek(initTime)
          shk.play()
          cy.get('.shk-bar-handle').as('handle').focus()
          cy.get('@handle').type(`{${c.action}}`).then(() => {
            let time = shk.audio.duration * c.expected
            if (c.action !== 'home' && c.action !== 'end') {
              time = time + initTime
            }
            expect(shk.audio.currentTime).to.be.closeTo(time, 1)
          })

        })
      })
    })
  })
})

describe('Seek controls', () => {
  it('disable seek controls when duration is not available', () => {
    const shk = new Shikwasa({
      audio: {
        src: '#',
        duration: 1,
      },
    })
    expect(shk.ui.seekControls.every(el => !el.disabled)).to.be.true
    shk.update({
      duration: 0,
      src: '#',
    })
    expect(shk.ui.seekControls.every(el => el.disabled)).to.be.true
  })

  it('enables seek controls when duration is available', () => {
    const shk = new Shikwasa({
      audio: {
        src: '#',
        duration: 0,
      },
    })
    expect(shk.ui.seekControls.every(el => el.disabled)).to.be.true
    shk.update({
      duration: 1,
      src: '#',
    })
    expect(shk.ui.seekControls.every(el => !el.disabled)).to.be.true
  })
})

describe('Time display', () => {
  it('displays the right audio current time', () => {
    const shk = new Shikwasa({
      audio: data.customAudio,
    })
    shk.audio.currentTime = 123
    cy.get('.shk-time_now').contains('02:03')
  })

  it('displays real duration after metadata is fetched', () => {
    new Shikwasa({
      audio: data.customAudio,
      preload: 'none',
    })
    cy.get('.shk-time_duration').contains('16:40')
    cy.get('.shk-btn_toggle').click()
    cy.get('.shk-time_duration').contains('11:07')
  })
})